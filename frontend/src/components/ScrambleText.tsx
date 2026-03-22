import { useRef, useEffect, forwardRef } from "react";
import { useTextScramble } from "@/hooks/useTextScramble";

interface ScrambleTextProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  autoPlay?: boolean;
  autoPlayDelay?: number;
}

const ScrambleText = forwardRef<HTMLElement, ScrambleTextProps>(
  ({ text, className, as: Tag = "span", autoPlay = false, autoPlayDelay = 0 }, _ref) => {
    const elRef = useRef<HTMLElement | null>(null);
    const scramble = useTextScramble();

    useEffect(() => {
      const el = elRef.current;
      if (!el) return;
      el.innerHTML = text;

      if (autoPlay) {
        const timer = setTimeout(() => {
          scramble(el, text);
        }, autoPlayDelay);
        return () => clearTimeout(timer);
      }

      const onEnter = () => scramble(el, text);
      el.addEventListener("mouseenter", onEnter);
      return () => el.removeEventListener("mouseenter", onEnter);
    }, [text, scramble, autoPlay, autoPlayDelay]);

    const Comp = Tag as React.ElementType;
    return (
      <Comp
        ref={(node: HTMLElement | null) => { elRef.current = node; }}
        className={className}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }
);
ScrambleText.displayName = "ScrambleText";

export default ScrambleText;
