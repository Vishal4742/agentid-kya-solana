import { useEffect, useState } from "react";

export default function CornerTelemetry() {
  const [time, setTime] = useState("");
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", { hour12: false }) +
          " UTC"
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <>
      {/* Bottom-left: live clock */}
      <div className="fixed bottom-5 left-5 z-40 pointer-events-none select-none hidden lg:block">
        <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest">
          {time}
        </span>
      </div>

      {/* Bottom-right: mouse coords */}
      <div className="fixed bottom-5 right-5 z-40 pointer-events-none select-none hidden lg:block text-right">
        <span className="font-mono text-[10px] text-muted-foreground/40">
          X: {mouse.x} Y: {mouse.y}
        </span>
      </div>
    </>
  );
}
