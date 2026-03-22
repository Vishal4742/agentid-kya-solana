import { useCallback, useEffect, useRef } from "react";

const CHARS = "!<>-_\\/[]{}—=+*^?#_·∴∵∶∷";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function useTextScramble() {
  const frameRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }
  }, []);

  const scramble = useCallback((
    el: HTMLElement,
    originalText: string,
    onDone?: () => void
  ) => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const length = originalText.length;
    const queue: Array<{ to: string; start: number; end: number; char?: string }> = [];

    for (let i = 0; i < length; i++) {
      const start = Math.floor(Math.random() * 30);
      const end = start + Math.floor(Math.random() * 30);
      queue.push({ to: originalText[i], start, end });
    }

    let frame = 0;
    const update = () => {
      let output = "";
      let complete = 0;
      for (let i = 0; i < queue.length; i++) {
        const { to, start, end } = queue[i];
        if (frame >= end) {
          complete++;
          output += escapeHtml(to);
        } else if (frame >= start) {
          if (!queue[i].char || Math.random() < 0.28) {
            queue[i].char = CHARS[Math.floor(Math.random() * CHARS.length)];
          }
          output += `<span class="text-green/50 font-mono">${escapeHtml(queue[i].char)}</span>`;
        } else {
          output += escapeHtml(to);
        }
      }
      el.innerHTML = output;
      if (complete === queue.length) {
        frameRef.current = null;
        onDone?.();
      } else {
        frameRef.current = requestAnimationFrame(update);
        frame++;
      }
    };
    update();
  }, []);

  return scramble;
}
