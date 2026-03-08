import { useEffect, useRef, useState } from "react";

const DENSITY = " .'`^,:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const CHAR_SIZE = 11;

function simpleNoise(x: number, y: number, t: number) {
  return (
    Math.sin(x * 0.05 + t) * Math.cos(y * 0.05 + t) +
    Math.sin(x * 0.01 - t) * Math.cos(y * 0.12) * 0.5
  );
}

export default function AsciiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const timeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [renderMs, setRenderMs] = useState("0.0");

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
    };

    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    window.addEventListener("mousemove", onMouseMove);

    let frameCount = 0;
    const render = () => {
      const start = performance.now();
      ctx.clearRect(0, 0, width, height);

      ctx.font = `${CHAR_SIZE}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const colsCount = Math.ceil(width / CHAR_SIZE);
      const rowsCount = Math.ceil(height / CHAR_SIZE);
      const t = timeRef.current;

      for (let row = 0; row < rowsCount; row++) {
        if (row < rowsCount * 0.35) continue;

        for (let col = 0; col < colsCount; col++) {
          const posX = col * CHAR_SIZE;
          const posY = row * CHAR_SIZE;

          const dx = posX - mouseRef.current.x;
          const dy = posY - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const normalizedY = (rowsCount - row) / rowsCount;
          const noiseVal = simpleNoise(col, row, t * 0.4);
          const mountainHeight =
            0.28 +
            Math.sin(col * 0.06 + t * 0.08) * 0.1 +
            Math.cos(col * 0.18) * 0.06;

          let char = "";
          let alpha = 0;

          if (normalizedY < mountainHeight + noiseVal * 0.1) {
            const idx = Math.floor(Math.abs(noiseVal) * DENSITY.length);
            char = DENSITY[idx % DENSITY.length];
            alpha = 0.15 + (1 - normalizedY * 2.5) * 0.5;
          }

          if (dist < 130) {
            const strength = 1 - dist / 130;
            if (Math.random() > 0.55) {
              char = Math.random() > 0.5 ? "0" : "1";
              ctx.fillStyle = `hsla(152,100%,50%,${strength * 0.9})`;
            } else {
              ctx.fillStyle = `hsla(152,100%,50%,${alpha * 0.6})`;
            }
            const shiftX = (dx / (dist + 0.01)) * 9 * strength;
            const shiftY = (dy / (dist + 0.01)) * 9 * strength;
            ctx.fillText(char, posX + CHAR_SIZE / 2 - shiftX, posY + CHAR_SIZE / 2 - shiftY);
          } else if (char) {
            ctx.fillStyle = `hsla(152,100%,50%,${alpha})`;
            ctx.fillText(char, posX + CHAR_SIZE / 2, posY + CHAR_SIZE / 2);
          }
        }
      }

      timeRef.current += 0.012;
      frameCount++;
      if (frameCount % 6 === 0) {
        setRenderMs((performance.now() - start).toFixed(1));
      }
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
      {/* Render telemetry */}
      <div className="absolute bottom-3 right-4 font-mono text-[10px] text-green/30 pointer-events-none select-none text-right">
        RENDER: <span>{renderMs}</span>ms
      </div>
    </div>
  );
}
