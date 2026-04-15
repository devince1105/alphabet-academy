"use client";

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { ScoreResult, ZERO_SCORE, calculateScore } from "@/lib/scoring";

interface DrawingCanvasProps {
  letter: string;
  fontSize?: number;
  strokeWidth?: number;
  showGuide?: boolean;
  onMetricsUpdate?: (result: ScoreResult) => void;
}

export interface DrawingCanvasHandle {
  clear: () => void;
  getMetrics: () => ScoreResult;
}


const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  ({ letter, fontSize = 220, strokeWidth = 14, showGuide = true, onMetricsUpdate }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const guideCanvasRef = useRef<HTMLCanvasElement>(null);
    const templateCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const strokeCountRef = useRef(0); // strokes drawn so far
    const [isDrawing, setIsDrawing] = useState(false);

    const buildTemplate = useCallback(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Wait for fonts to be ready so Inter is used (not fallback)
      await document.fonts.ready;

      // Setup high DPI canvas
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Drawing style
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = "#4338ca";

      // Build template canvas — must use same font weight (900 = font-black)
      const tCanvas = document.createElement("canvas");
      tCanvas.width = canvas.width;
      tCanvas.height = canvas.height;
      const tCtx = tCanvas.getContext("2d");
      if (!tCtx) return;

      tCtx.scale(dpr, dpr);
      // Match font-black (900) and same font stack as Tailwind/Inter
      tCtx.font = `900 ${fontSize}px "Inter", ui-sans-serif, system-ui, sans-serif`;
      tCtx.textAlign = "center";
      tCtx.textBaseline = "middle";

      // Fill the letter shape
      tCtx.fillStyle = "#000";
      tCtx.fillText(letter, rect.width / 2, rect.height / 2);

      // Broaden hit area with thick stroke (child-friendly tolerance)
      tCtx.strokeStyle = "#000";
      tCtx.lineWidth = 20;
      tCtx.lineJoin = "round";
      tCtx.strokeText(letter, rect.width / 2, rect.height / 2);

      templateCanvasRef.current = tCanvas;

      // --- Guide canvas: brush paint effect ---
      const gCanvas = guideCanvasRef.current;
      if (!gCanvas) return;
      gCanvas.width = canvas.width;
      gCanvas.height = canvas.height;
      const gCtx = gCanvas.getContext("2d");
      if (!gCtx) return;

      gCtx.scale(dpr, dpr);
      gCtx.font = `900 ${fontSize}px "Inter", ui-sans-serif, system-ui, sans-serif`;
      gCtx.textAlign = "center";
      gCtx.textBaseline = "middle";

      const cx = rect.width / 2;
      const cy = rect.height / 2;

      // Layer 1 — wide soft halo (brush bleed)
      gCtx.globalAlpha = 0.08;
      gCtx.fillStyle = "#8b9bd4";
      for (const [ox, oy] of [[-3,-2],[3,-2],[-2,3],[2,3],[0,0]]) {
        gCtx.fillText(letter, cx + ox, cy + oy);
      }

      // Layer 2 — main body
      gCtx.globalAlpha = 0.28;
      gCtx.fillStyle = "#8b9bd4";
      gCtx.fillText(letter, cx, cy);

      // Layer 3 — slightly offset for ink variance feel
      gCtx.globalAlpha = 0.10;
      gCtx.fillStyle = "#6d7fc7";
      gCtx.fillText(letter, cx + 1, cy + 1);

      gCtx.globalAlpha = 1;
    }, [letter, fontSize, strokeWidth]);

    useEffect(() => {
      buildTemplate();
    }, [buildTemplate]);

    const computeMetrics = (): ScoreResult => {
      // Early exit — nothing drawn yet
      if (strokeCountRef.current === 0) return ZERO_SCORE;

      const canvas  = canvasRef.current;
      const tCanvas = templateCanvasRef.current;
      if (!canvas || !tCanvas) return ZERO_SCORE;

      const ctx  = canvas.getContext("2d");
      const tCtx = tCanvas.getContext("2d");
      if (!ctx || !tCtx) return ZERO_SCORE;

      const { width, height } = canvas;

      // Read both canvases into ImageData and delegate to the scoring engine.
      // getImageData forces a GPU→CPU readback; unavoidable for pixel scoring.
      const userImageData   = ctx.getImageData(0, 0, width, height);
      const targetImageData = tCtx.getImageData(0, 0, width, height);

      return calculateScore(targetImageData, userImageData);
    };

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = "#4338ca";
        strokeCountRef.current = 0; // reset stroke count
      },
      getMetrics: computeMetrics,
    }));

    const getCoords = (e: React.MouseEvent | React.TouchEvent, rect: DOMRect) => {
      if ("touches" in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const { x, y } = getCoords(e, rect);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const { x, y } = getCoords(e, rect);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      if (!isDrawing) return;
      setIsDrawing(false);
      strokeCountRef.current += 1; // count each pen-lift as one stroke
      if (onMetricsUpdate) {
        onMetricsUpdate(computeMetrics());
      }
    };

    return (
      <div className="relative w-full h-full cursor-crosshair touch-none overflow-hidden">
        {/* Guide layer — brush painted letter, hidden after scoring */}
        <canvas
          ref={guideCanvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-300 ${showGuide ? "opacity-100" : "opacity-0"}`}
        />
        {/* Drawing layer */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-10"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    );
  }
);

DrawingCanvas.displayName = "DrawingCanvas";

export default DrawingCanvas;
