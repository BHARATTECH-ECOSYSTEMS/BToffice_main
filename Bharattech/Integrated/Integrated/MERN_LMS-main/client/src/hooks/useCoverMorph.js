import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

// A clicked course card's cover grows into the course page's cover (owner's 1A, 2026-10-27), with the browser's own
// view transition. React Router does this only under a data router, and Learning uses BrowserRouter, so it is done
// here. Without the browser feature, with reduced motion, or on a new-tab click, the link simply opens the page.

const NAME = "course-cover";
// the course page loads its course first; past this the page shows anyway and the cover just fades in
const WAIT_MS = 400;

// a timer, not requestAnimationFrame: the browser draws no frames while it waits for the new page
const coursePageCover = () =>
  new Promise((resolve) => {
    const start = performance.now();
    const check = () =>
      document.querySelector("[data-course-cover]") || performance.now() - start > WAIT_MS ? resolve() : setTimeout(check, 16);
    check();
  });

export function useCoverMorph() {
  const navigate = useNavigate();

  return useCallback(
    (event, to, cover) => {
      const plainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
      if (!plainClick || !cover || !document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      event.preventDefault();
      cover.style.viewTransitionName = NAME;
      document.startViewTransition(async () => {
        // only one element may carry the name in the new page: the course page's cover
        cover.style.viewTransitionName = "";
        navigate(to);
        await coursePageCover();
      });
    },
    [navigate],
  );
}
