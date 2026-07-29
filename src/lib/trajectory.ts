export type StrokePoint = {
  x: number;
  y: number;
  time: number;
};

export type StrokePath = StrokePoint[];

export type TrajectoryMetrics = {
  strokeCount: number;
  expectedStrokeMin: number;
  expectedStrokeMax: number;
  normalizedLength: number;
  turnCount: number;
  reversalCount: number;
  revisitRatio: number;
  endpointAccuracy: number;
  directionRatios: DirectionRatios;
  directionStructure: number;
  quality: number;
  controlled: boolean;
};

type Direction = "horizontal" | "vertical" | "diagonalDown" | "diagonalUp";
type DirectionRatios = Record<Direction, number>;

const EXPECTED_STROKES: Record<string, [number, number]> = {
  A: [2, 4], B: [2, 4], C: [1, 2], D: [2, 3], E: [2, 5], F: [2, 4],
  G: [1, 3], H: [2, 4], I: [1, 3], J: [1, 2], K: [2, 4], L: [1, 2],
  M: [2, 5], N: [2, 4], O: [1, 2], P: [2, 3], Q: [1, 3], R: [2, 4],
  S: [1, 2], T: [2, 3], U: [1, 2], V: [1, 2], W: [1, 3], X: [2, 3],
  Y: [2, 3], Z: [1, 2],
  a: [1, 3], b: [1, 2], c: [1, 2], d: [1, 2], e: [1, 2], f: [1, 3],
  g: [1, 3], h: [1, 2], i: [2, 3], j: [2, 3], k: [2, 4], l: [1, 2],
  m: [1, 3], n: [1, 2], o: [1, 2], p: [1, 2], q: [1, 2], r: [1, 2],
  s: [1, 2], t: [2, 3], u: [1, 2], v: [1, 2], w: [1, 2], x: [2, 3],
  y: [1, 3], z: [1, 2],
};

// Undirected stroke orientations required by each letter's main structure.
// Ratios are checked generously, so shaky children's strokes still qualify.
const REQUIRED_DIRECTIONS: Partial<Record<string, Direction[]>> = {
  A: ["horizontal", "diagonalDown", "diagonalUp"],
  E: ["horizontal", "vertical"],
  F: ["horizontal", "vertical"],
  H: ["horizontal", "vertical"],
  K: ["vertical", "diagonalDown", "diagonalUp"],
  L: ["horizontal", "vertical"],
  M: ["vertical", "diagonalDown", "diagonalUp"],
  N: ["vertical", "diagonalDown"],
  T: ["horizontal", "vertical"],
  V: ["diagonalDown", "diagonalUp"],
  W: ["diagonalDown", "diagonalUp"],
  X: ["diagonalDown", "diagonalUp"],
  Y: ["vertical", "diagonalDown", "diagonalUp"],
  Z: ["horizontal", "diagonalDown"],
  f: ["horizontal", "vertical"],
  h: ["horizontal", "vertical"],
  k: ["vertical", "diagonalDown", "diagonalUp"],
  l: ["vertical"],
  t: ["horizontal", "vertical"],
  v: ["diagonalDown", "diagonalUp"],
  w: ["diagonalDown", "diagonalUp"],
  x: ["diagonalDown", "diagonalUp"],
  y: ["diagonalDown", "diagonalUp"],
  z: ["horizontal", "diagonalDown"],
};

const DIRECTION_MIN_RATIOS: Partial<
  Record<string, Partial<Record<Direction, number>>>
> = {
  // The two diagonals are the defining structure of A. A few rounded turns at
  // the ends of horizontal scribbles must not be mistaken for diagonal legs.
  A: { horizontal: 0.08, diagonalDown: 0.2, diagonalUp: 0.2 },
};

const CURVED_LETTERS = new Set([
  "B", "C", "D", "G", "J", "O", "P", "Q", "R", "S", "U",
  "a", "b", "c", "d", "e", "g", "j", "m", "n", "o", "p", "q",
  "r", "s", "u",
]);

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function classifyDirection(dx: number, dy: number): Direction {
  // Ignore direction of travel: 0° and 180° are both horizontal.
  const angle = ((Math.atan2(dy, dx) * 180 / Math.PI) + 180) % 180;
  if (angle < 20 || angle >= 160) return "horizontal";
  if (angle < 78) return "diagonalDown";
  if (angle < 102) return "vertical";
  return "diagonalUp";
}

function angleBetween(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const aLength = Math.hypot(ax, ay);
  const bLength = Math.hypot(bx, by);
  if (aLength === 0 || bLength === 0) return 0;
  const cosine = Math.max(
    -1,
    Math.min(1, (ax * bx + ay * by) / (aLength * bLength)),
  );
  return Math.acos(cosine) * 180 / Math.PI;
}

/**
 * Evaluates how the letter was drawn, independently of its final bitmap.
 * Repeated passes through the same cells and frequent direction reversals are
 * strong scribble signals, while ordinary shaky handwriting remains tolerated.
 */
export function analyzeTrajectory(
  letter: string,
  strokes: StrokePath[],
  width: number,
  height: number,
  isNearTarget: (point: StrokePoint) => boolean,
): TrajectoryMetrics {
  const meaningfulStrokes = strokes.filter((stroke) => stroke.length >= 2);
  const [expectedStrokeMin, expectedStrokeMax] =
    EXPECTED_STROKES[letter] ?? [1, 4];
  const diagonal = Math.max(1, Math.hypot(width, height));
  const sampleStep = Math.max(3, Math.min(width, height) * 0.012);
  const gridSize = Math.max(7, Math.min(width, height) * 0.035);

  let totalLength = 0;
  let turnCount = 0;
  let reversalCount = 0;
  let sampledCount = 0;
  let revisitCount = 0;
  const directionLengths: Record<Direction, number> = {
    horizontal: 0,
    vertical: 0,
    diagonalDown: 0,
    diagonalUp: 0,
  };
  const lastVisit = new Map<string, number>();
  const endpoints: StrokePoint[] = [];

  for (const stroke of meaningfulStrokes) {
    endpoints.push(stroke[0], stroke[stroke.length - 1]);
    const sampled: StrokePoint[] = [stroke[0]];
    let distanceSinceSample = 0;

    for (let i = 1; i < stroke.length; i++) {
      const previous = stroke[i - 1];
      const point = stroke[i];
      const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
      totalLength += distance;
      if (distance > 0) {
        directionLengths[
          classifyDirection(point.x - previous.x, point.y - previous.y)
        ] += distance;
      }
      distanceSinceSample += distance;
      if (distanceSinceSample >= sampleStep) {
        sampled.push(point);
        distanceSinceSample = 0;
      }
    }

    for (let i = 1; i < sampled.length - 1; i++) {
      const previous = sampled[i - 1];
      const point = sampled[i];
      const next = sampled[i + 1];
      const angle = angleBetween(
        point.x - previous.x,
        point.y - previous.y,
        next.x - point.x,
        next.y - point.y,
      );
      if (angle >= 55) turnCount++;
      if (angle >= 135) reversalCount++;
    }

    for (const point of sampled) {
      const cell = `${Math.floor(point.x / gridSize)}:${Math.floor(point.y / gridSize)}`;
      const previousVisit = lastVisit.get(cell);
      if (previousVisit !== undefined && sampledCount - previousVisit > 4) {
        revisitCount++;
      }
      lastVisit.set(cell, sampledCount++);
    }
  }

  const strokeCount = meaningfulStrokes.length;
  const normalizedLength = totalLength / diagonal;
  const revisitRatio = sampledCount === 0 ? 0 : revisitCount / sampledCount;
  const endpointAccuracy =
    endpoints.length === 0
      ? 0
      : endpoints.filter(isNearTarget).length / endpoints.length;
  const directionRatios: DirectionRatios = {
    horizontal: totalLength === 0 ? 0 : directionLengths.horizontal / totalLength,
    vertical: totalLength === 0 ? 0 : directionLengths.vertical / totalLength,
    diagonalDown: totalLength === 0 ? 0 : directionLengths.diagonalDown / totalLength,
    diagonalUp: totalLength === 0 ? 0 : directionLengths.diagonalUp / totalLength,
  };
  const requiredDirections = REQUIRED_DIRECTIONS[letter] ?? [];
  const directionMinimums = DIRECTION_MIN_RATIOS[letter] ?? {};
  const requiredDirectionHits = requiredDirections.filter(
    (direction) =>
      directionRatios[direction] >= (directionMinimums[direction] ?? 0.06),
  ).length;
  const occupiedDirectionBins = Object.values(directionRatios).filter(
    (ratio) => ratio >= 0.07,
  ).length;
  const directionStructure =
    requiredDirections.length > 0
      ? requiredDirectionHits / requiredDirections.length
      : CURVED_LETTERS.has(letter)
        ? Math.min(1, occupiedDirectionBins / 3)
        : 1;

  const strokePenalty =
    strokeCount < expectedStrokeMin
      ? (expectedStrokeMin - strokeCount) * 0.12
      : Math.max(0, strokeCount - expectedStrokeMax) * 0.1;
  const lengthPenalty = Math.max(0, normalizedLength - 4.8) * 0.11;
  const reversalPenalty = Math.max(0, reversalCount - 3) * 0.055;
  const revisitPenalty = Math.max(0, revisitRatio - 0.16) * 1.7;
  const endpointPenalty = Math.max(0, 0.5 - endpointAccuracy) * 0.35;
  const directionPenalty = (1 - directionStructure) * 0.55;

  const quality = clamp01(
    1 -
    strokePenalty -
    lengthPenalty -
    reversalPenalty -
    revisitPenalty -
    endpointPenalty -
    directionPenalty,
  );

  // These are intentionally generous: shaky lines create turns, but scribbling
  // usually combines excessive length, repeated cells and many reversals.
  const controlled =
    strokeCount > 0 &&
    strokeCount <= expectedStrokeMax + 4 &&
    normalizedLength <= 7 &&
    revisitRatio <= 0.42 &&
    reversalCount <= 12 &&
    endpointAccuracy >= 0.25 &&
    // One missing structural direction can still be a genuine early attempt.
    // Higher star tiers enforce the complete direction signature separately.
    directionStructure >= 0.66 &&
    quality >= 0.32;

  return {
    strokeCount,
    expectedStrokeMin,
    expectedStrokeMax,
    normalizedLength: +normalizedLength.toFixed(3),
    turnCount,
    reversalCount,
    revisitRatio: +revisitRatio.toFixed(3),
    endpointAccuracy: +endpointAccuracy.toFixed(3),
    directionRatios: {
      horizontal: +directionRatios.horizontal.toFixed(3),
      vertical: +directionRatios.vertical.toFixed(3),
      diagonalDown: +directionRatios.diagonalDown.toFixed(3),
      diagonalUp: +directionRatios.diagonalUp.toFixed(3),
    },
    directionStructure: +directionStructure.toFixed(3),
    quality: +quality.toFixed(3),
    controlled,
  };
}
