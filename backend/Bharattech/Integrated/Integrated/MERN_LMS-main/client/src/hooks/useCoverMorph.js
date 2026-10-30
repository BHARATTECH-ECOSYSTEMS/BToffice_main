import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { isListPath } from "../utils/backToList";

// A clicked course card's cover grows into the course page's cover (owner's 1A, 2026-10-27), with the browser's own
// view transition. React Router does this only under a data router, and Learning uses BrowserRouter, so it is done
// here. Without the browser feature, with reduced motion, or on a new-tab click, the link simply opens the page.

const NAME = "course-cover";
// the new page may still be loading; past this it shows anyway and the cover just fades
const WAIT_MS = 400;

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// a timer, not requestAnimationFrame: the browser draws no frames while it waits for the new page
const appears = (selector) =>
  new Promise((resolve) => {
    const start = performance.now();
    const check = () => {
      const found = document.querySelector(selector);
      if (found || performance.now() - start > WAIT_MS) resolve(found);
      else setTimeout(check, 16);
    };
    check();
  });

export function useCoverMorph() {
  const navigate = useNavigate();

  return useCallback(
    (event, to, cover, state) => {
      const plainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
      if (!plainClick || !cover || !document.startViewTransition || reducedMotion()) return;

      event.preventDefault();
      cover.style.viewTransitionName = NAME;
      document.startViewTransition(async () => {
        // only one element may carry the name in the new page: the course page's cover
        cover.style.viewTransitionName = "";
        navigate(to, { state });
        await appears("[data-course-cover]");
      });
    },
    [navigate],
  );
}

// handing our own copy of a back step on to React Router, which this listener must let through
let handingOn = false;

// Going back from a course to a list, its cover shrinks back into its card (owner's 1A 2A, 2026-10-27): the back link
// and the browser's back button alike. A back step reaches React Router as a popstate once the address has changed
// but before the page has, so the course page is still on screen here: the view transition takes its picture, then
// the popstate is handed on. Listeners on window run in the order they were added, capture or not, and React renders
// a popstate's update at once, so this must be added before React Router's: main.jsx calls it before the first render.
export function watchBackMorph() {
  if (!document.startViewTransition) return;

  window.addEventListener("popstate", (event) => {
    if (handingOn) return;
    const courseCover = document.querySelector("[data-course-cover]");
    if (!courseCover || !isListPath(window.location.pathname) || reducedMotion()) return;

    event.stopImmediatePropagation();
    let card = null;
    const transition = document.startViewTransition(async () => {
      handingOn = true;
      window.dispatchEvent(new PopStateEvent("popstate", { state: event.state }));
      handingOn = false;
      // a card scrolled out of the list isn't found, and the course's cover just fades
      card = await appears(`[data-card-cover="${CSS.escape(courseCover.dataset.courseCover)}"]`);
      if (card) card.style.viewTransitionName = NAME;
    });
    const clear = () => {
      if (card) card.style.viewTransitionName = "";
    };
    transition.finished.then(clear, clear);
  });
}
