import { useLayoutEffect, type RefObject } from "react";

const MAX_PX = 16;
const MIN_PX = 11;

// Steps the font size down until the text fits its box.
export function useFitText(ref: RefObject<HTMLElement | null>, text: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let active = true;
    const fit = () => {
      if (!active) return;
      let size = MAX_PX;
      el.style.fontSize = `${size}px`;
      while (el.scrollHeight > el.clientHeight && size > MIN_PX) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    // A late-loading font changes line wrapping without resizing the box.
    void document.fonts.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      active = false;
      ro.disconnect();
    };
  }, [ref, text]);
}
