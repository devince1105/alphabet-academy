/**
 * ============================================================================
 * Handwriting Scoring Engine
 * ============================================================================
 *
 * Evaluates a user's drawing against a reference letter bitmap using three
 * complementary metrics, combined into a single weighted final score.
 *
 *  METRIC           FORMULA                          WEIGHT  ROLE
 *  ─────────────── ─────────────────────────────── ──────── ───────────────
 *  Overlap Ratio   overlapPixels / targetPixels      50 %    Primary accuracy
 *  Precision       overlapPixels / userPixels        30 %    Anti-cheat gate
 *  Recall          overlapPixels / targetPixels      20 %    Completeness
 *
 *  finalScore = (overlapRatio×0.5 + precision×0.3 + recall×0.2) × 100
 *
 * Bonus features
 *  ─ Morphological dilation  O(n) sliding-window pass on the user bitmap,
 *    giving child-friendly positional tolerance without inflating scores for
 *    strokes that are far off-target.
 *  ─ Bounding-box penalty    Penalises pixels drawn well outside the letter's
 *    axis-aligned bounding box, punishing whole-canvas scribbling.
 *
 * ============================================================================
 */

// ─── Public types ────────────────────────────────────────────────────────────

export type ScoreResult = {
  /** Fraction of target shape covered by user drawing  (0–1) */
  overlapRatio: number;
  /** Fraction of user's drawing that lands on target   (0–1) */
  precision: number;
  /** Same as overlapRatio — kept explicit for weight flexibility (0–1) */
  recall: number;
  /** Weighted final score, Math.floor'd to prevent threshold inflation (0–100) */
  finalScore: number;
  /** Star rating derived from finalScore */
  stars: 0 | 1 | 2 | 3;
  // ── debug / diagnostic fields ─────────────────────────────────────────────
  targetPixels: number;
  userPixels: number;
  overlapPixels: number;
  /** Fraction of raw user pixels that fell outside the template bounding box */
  outsideBoxRatio: number;
};

/** Canonical zero result — returned for empty drawing or missing canvas data */
export const ZERO_SCORE: ScoreResult = {
  overlapRatio:    0,
  precision:       0,
  recall:          0,
  finalScore:      0,
  stars:           0,
  targetPixels:    0,
  userPixels:      0,
  overlapPixels:   0,
  outsideBoxRatio: 0,
};

// ─── Tuning constants ─────────────────────────────────────────────────────────

/**
 * Binary pixel threshold.
 * Alpha > 128 (50 %) treats fully opaque strokes as drawn.
 * This discards anti-alias fringes (typically alpha 1–80) so they cannot
 * accumulate into false positives.
 */
const ALPHA_THRESHOLD = 128;

/**
 * Dilation radius in physical canvas pixels.
 * Expands each user pixel outward before counting overlap, providing
 * positional tolerance for slightly offset but recognisable strokes.
 * Increasing this makes scoring more lenient.
 * ── Children's setting: 14 (generous tolerance for small-hand motor skills) ──
 */
const DILATION_RADIUS = 14;

/**
 * Maximum fraction of finalScore that the bounding-box penalty can remove.
 * At outsideBoxRatio = 1 (all pixels outside bbox), score is reduced by
 * BBOX_PENALTY_WEIGHT × 100 %. Set to 0 to disable.
 * ── Children's setting: 0.1 (kids naturally draw outside the lines) ──
 */
const BBOX_PENALTY_WEIGHT = 0.1;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Convert a raw RGBA Uint8ClampedArray to a flat binary Uint8Array.
 * Pixel i is 1 if its alpha channel exceeds ALPHA_THRESHOLD, otherwise 0.
 * Also returns the count of set pixels (avoids a second pass for guards).
 */
function toBinaryBitmap(
  data: Uint8ClampedArray,
): { bitmap: Uint8Array; total: number } {
  const pixelCount = data.length >>> 2; // length / 4
  const bitmap = new Uint8Array(pixelCount);
  let total = 0;
  for (let i = 0; i < pixelCount; i++) {
    if (data[(i << 2) + 3] > ALPHA_THRESHOLD) {
      bitmap[i] = 1;
      total++;
    }
  }
  return { bitmap, total };
}

/**
 * Morphological dilation using two O(n) separable sliding-window passes
 * (horizontal then vertical).  Complexity: O(width × height) regardless of
 * radius — unlike the naïve O(n × r²) nested-loop approach.
 *
 * After dilation a pixel is "on" if any original pixel within a
 * (2r+1) × (2r+1) square neighbourhood was "on".
 */
function dilate(
  bitmap: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  if (radius <= 0) return bitmap;

  // ── Horizontal pass ───────────────────────────────────────────────────────
  const hPass = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const rowBase = y * width;
    // Bootstrap: count pixels in the initial window centred at x = 0,
    // i.e. [max(0, -r) … min(width-1, r)] → [0 … min(width-1, r)]
    let count = 0;
    for (let nx = 0; nx <= Math.min(radius, width - 1); nx++) {
      if (bitmap[rowBase + nx]) count++;
    }
    for (let x = 0; x < width; x++) {
      if (count > 0) hPass[rowBase + x] = 1;
      // Slide window right:
      // ADD the pixel entering the right edge of the NEXT position's window
      const entering = x + radius + 1;
      if (entering < width && bitmap[rowBase + entering]) count++;
      // REMOVE the pixel leaving the left edge of the NEXT position's window
      const leaving = x - radius;
      if (leaving >= 0 && bitmap[rowBase + leaving]) count--;
    }
  }

  // ── Vertical pass ─────────────────────────────────────────────────────────
  const result = new Uint8Array(width * height);
  for (let x = 0; x < width; x++) {
    let count = 0;
    for (let ny = 0; ny <= Math.min(radius, height - 1); ny++) {
      if (hPass[ny * width + x]) count++;
    }
    for (let y = 0; y < height; y++) {
      if (count > 0) result[y * width + x] = 1;
      const entering = y + radius + 1;
      if (entering < height && hPass[entering * width + x]) count++;
      const leaving = y - radius;
      if (leaving >= 0 && hPass[leaving * width + x]) count--;
    }
  }

  return result;
}

/**
 * Return the axis-aligned bounding box of all "on" pixels in a bitmap,
 * or null if the bitmap is empty.
 */
function getBoundingBox(
  bitmap: Uint8Array,
  width: number,
  height: number,
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (bitmap[y * width + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX === -1 ? null : { minX, maxX, minY, maxY };
}

// ─── Main scoring function ────────────────────────────────────────────────────

/**
 * Compare user's handwriting against the reference letter and produce a
 * rich ScoreResult.
 *
 * Algorithm steps:
 *   1. Binarize both bitmaps with alpha > 128 threshold
 *   2. Dilate the user bitmap (tolerance for slight offsets)
 *   3. Compute bounding box of template for penalty calculation
 *   4. Single-pass pixel counting: targetPixels, userPixels, overlapPixels
 *   5. Derive overlapRatio, precision, recall
 *   6. Weighted final score
 *   7. Bounding-box penalty
 *   8. Math.floor (no rounding up at star thresholds)
 *   9. Star rating
 *  10. Debug log
 *
 * @param targetImageData  ImageData from the reference/template canvas
 * @param userImageData    ImageData from the drawing canvas
 */
export function calculateScore(
  targetImageData: ImageData,
  userImageData: ImageData,
): ScoreResult {
  const width  = targetImageData.width;
  const height = targetImageData.height;

  // ── 1. Binarize ────────────────────────────────────────────────────────────
  const { bitmap: targetBitmap, total: targetTotal } = toBinaryBitmap(targetImageData.data);
  const { bitmap: userBitmapRaw, total: userRawTotal } = toBinaryBitmap(userImageData.data);

  // Guard: cannot score against an empty template
  if (targetTotal === 0) {
    console.warn("[scoring] targetPixels === 0 — template not ready");
    return ZERO_SCORE;
  }

  // Guard: user has not drawn anything
  if (userRawTotal === 0) {
    return ZERO_SCORE;
  }

  // ── 2. Dilate user bitmap ──────────────────────────────────────────────────
  // The dilated bitmap is used for overlap / userPixels counting so that
  // strokes slightly outside the template edge still contribute.
  // The raw bitmap is kept for bounding-box penalty (dilation would
  // artificially expand outside-box measurements).
  const userBitmap = dilate(userBitmapRaw, width, height, DILATION_RADIUS);

  // ── 3. Template bounding box ───────────────────────────────────────────────
  const bbox = getBoundingBox(targetBitmap, width, height);

  // ── 4. Single-pass pixel counting ─────────────────────────────────────────
  let targetPixels  = 0; // on-pixels in template
  let userPixels    = 0; // on-pixels in dilated user drawing
  let overlapPixels = 0; // dilated-user ∩ template
  let outsideBox    = 0; // raw-user pixels outside template bbox

  for (let i = 0, len = width * height; i < len; i++) {
    const isTarget  = targetBitmap[i]  === 1;
    const isUser    = userBitmap[i]    === 1; // dilated
    const isUserRaw = userBitmapRaw[i] === 1; // original (for penalty only)

    if (isTarget) targetPixels++;

    if (isUser) {
      userPixels++;
      if (isTarget) overlapPixels++;
    }

    // Bounding-box penalty: count raw user pixels that fall outside bbox
    if (bbox && isUserRaw) {
      const x = i % width;
      const y = Math.floor(i / width);
      if (x < bbox.minX || x > bbox.maxX || y < bbox.minY || y > bbox.maxY) {
        outsideBox++;
      }
    }
  }

  // ── 5. Metric computation ──────────────────────────────────────────────────

  // Overlap Ratio — PRIMARY: "What fraction of the letter is covered?"
  // Division by zero guarded above (targetTotal > 0 → targetPixels > 0).
  const overlapRatio = overlapPixels / targetPixels;

  // Precision — ANTI-CHEAT: "What fraction of the user's drawing is correct?"
  // Scribbling everywhere → userPixels grows → precision shrinks.
  // userPixels = 0 guard: dilated user can only be empty if raw was empty
  // (which is caught by userRawTotal === 0 guard above).
  const precision = userPixels === 0 ? 0 : overlapPixels / userPixels;

  // Recall — COMPLETENESS: same as overlapRatio, kept separate for weight
  // flexibility (e.g. future per-letter weighting).
  const recall = overlapRatio;

  // ── 6. Weighted score ──────────────────────────────────────────────────────
  //
  //   overlapRatio × 0.5   primary completeness signal
  //   precision    × 0.3   penalises imprecise or excessive strokes
  //   recall       × 0.2   reinforces completeness
  //
  // Note: since recall ≡ overlapRatio, this simplifies algebraically to
  //   (overlapRatio × 0.7 + precision × 0.3), but the three-term form is
  //   intentionally preserved so future non-trivial recall definitions
  //   (e.g. stroke-order weighting) slot in without changing the formula.
  const rawScore =
    overlapRatio * 0.5 +
    precision    * 0.3 +
    recall       * 0.2;

  // ── 7. Bounding-box penalty ────────────────────────────────────────────────
  // outsideBoxRatio = fraction of the user's raw strokes outside the bbox.
  // penalty reduces final score by up to (BBOX_PENALTY_WEIGHT × 100) %.
  // E.g. if the user drew 40 % of their pixels outside the bbox and weight=0.25,
  // the score is multiplied by (1 − 0.25 × 0.40) = 0.90 → −10 % reduction.
  const outsideBoxRatio = userRawTotal === 0 ? 0 : outsideBox / userRawTotal;
  const penaltyFactor   = 1 - outsideBoxRatio * BBOX_PENALTY_WEIGHT;

  // ── 8. Normalize, apply penalty, clamp, floor ─────────────────────────────
  // Math.floor prevents a rawScore of 0.899 from reaching 90 (3-star threshold).
  // This is intentionally strict — borderline attempts should earn the lower tier.
  const finalScore = Math.min(
    100,
    Math.max(0, Math.floor(rawScore * penaltyFactor * 100)),
  );

  // ── 9. Star rating ─────────────────────────────────────────────────────────
  // Children's thresholds — very encouraging:
  //   3 ★  覆蓋 ≥ 60%   畫得出樣子就給三顆星
  //   2 ★  覆蓋 ≥ 35%
  //   1 ★  覆蓋 ≥ 12%   任何認真嘗試
  //   0 ★  < 12%
  const stars: 0 | 1 | 2 | 3 =
    overlapRatio >= 0.60 ? 3 :
    overlapRatio >= 0.35 ? 2 :
    overlapRatio >= 0.12 ? 1 :
    0;

  // ── 10. Debug log ──────────────────────────────────────────────────────────
  console.log("[scoring] calculateScore →", {
    targetPixels,
    userPixels,
    overlapPixels,
    overlapRatio:    +overlapRatio.toFixed(4),
    precision:       +precision.toFixed(4),
    recall:          +recall.toFixed(4),
    rawScore:        +rawScore.toFixed(4),
    outsideBoxRatio: +outsideBoxRatio.toFixed(4),
    penaltyFactor:   +penaltyFactor.toFixed(4),
    finalScore,
    stars,
  });

  return {
    overlapRatio:    +overlapRatio.toFixed(4),
    precision:       +precision.toFixed(4),
    recall:          +recall.toFixed(4),
    finalScore,
    stars,
    targetPixels,
    userPixels,
    overlapPixels,
    outsideBoxRatio: +outsideBoxRatio.toFixed(4),
  };
}
