import { useEffect, useState } from "react";

/**
 * Tracks the visual viewport so mobile UI (especially AIChat's input box)
 * can stay above the on-screen keyboard.
 *
 * Returns the current `visualViewport.height` in pixels (shrinks when the
 * soft keyboard opens). Also re-renders on `resize` and `scroll` events
 * because the visual viewport shifts around on iOS Safari when the keyboard
 * is being shown/hidden.
 *
 * On desktop (no `visualViewport` API), returns `window.innerHeight`.
 */
export function useVisualViewport(): number {
  const [height, setHeight] = useState<number>(() => {
    if (typeof window === "undefined") return 600;
    return window.visualViewport?.height ?? window.innerHeight;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      setHeight(window.visualViewport?.height ?? window.innerHeight);
    };
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return height;
}

/**
 * Hook that returns `true` when the soft keyboard is likely open.
 * Heuristic: keyboard is open when the visualViewport is significantly
 * shorter than the layout viewport.
 */
export function useIsKeyboardOpen(): boolean {
  const height = useVisualViewport();
  if (typeof window === "undefined") return false;
  return window.innerHeight - height > 120;
}
