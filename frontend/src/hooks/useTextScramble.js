import { useState, useEffect, useRef } from "react";

const CHARS = "!<>-_\\/[]{}—=+*^?#_ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function useTextScramble(text, { delay = 0, speed = 30, scrambleCount = 3 } = {}) {
  const [display, setDisplay] = useState("");
  const frameRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!text) return;
    let frame = 0;
    const totalFrames = text.length * scrambleCount + text.length;
    const queue = [];

    // Build queue: for each character position, queue up random chars then the final char
    for (let i = 0; i < text.length; i++) {
      const finalChar = text[i];
      if (finalChar === " ") {
        queue.push({ char: " ", resolved: true, frame: 0 });
        continue;
      }
      for (let s = 0; s < scrambleCount; s++) {
        queue.push({
          char: CHARS[Math.floor(Math.random() * CHARS.length)],
          resolved: false,
          frame: i * scrambleCount + s,
        });
      }
      queue.push({ char: finalChar, resolved: true, frame: i * scrambleCount + scrambleCount });
    }

    const timeout = setTimeout(() => {
      startedRef.current = true;
      const tick = () => {
        const output = [];
        for (let i = 0; i < text.length; i++) {
          const charQueue = queue.filter((q) => {
            // Find the latest entry for position i
            const posStart = i * (scrambleCount + 1);
            const posEnd = posStart + scrambleCount + 1;
            return queue.indexOf(q) >= posStart && queue.indexOf(q) < posEnd;
          });

          // Find the best character for this position at current frame
          let bestChar = " ";
          for (const entry of charQueue) {
            if (entry.frame <= frame) {
              bestChar = entry.char;
            }
          }
          output.push(bestChar);
        }

        setDisplay(output.join(""));

        if (frame < totalFrames) {
          frame++;
          frameRef.current = requestAnimationFrame(tick);
        }
      };
      frameRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [text, delay, speed, scrambleCount]);

  return display;
}
