"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function VisualSignaturePad({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.lineWidth = 2;
    context.lineCap = "round";
    context.strokeStyle = "#064e3b";
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const p = point(event);
    context.beginPath();
    context.moveTo(p.x, p.y);
    setDrawing(true);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const p = point(event);
    context.lineTo(p.x, p.y);
    context.stroke();
    onChange(event.currentTarget.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700">
        <canvas
          ref={canvasRef}
          width={520}
          height={160}
          className="h-36 w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={() => setDrawing(false)}
          onPointerLeave={() => setDrawing(false)}
          aria-label="Draw electronic signature"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-slate-500">{value ? "Signature captured." : "Draw your signature above."}</p>
        <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-700">
          <RotateCcw className="size-3.5" />
          Clear
        </button>
      </div>
    </div>
  );
}
