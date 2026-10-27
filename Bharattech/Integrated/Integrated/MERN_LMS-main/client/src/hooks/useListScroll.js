import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { savedScroll } from "../utils/backToList";

/** A list opens at its top, except coming back to it: then where you left it (owner's 4A, 2026-10-27). */
export function useListScroll() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  // before the page is drawn, so a course's cover can shrink back into a card that is on screen. Only when the list
  // first shows: typing a search changes the address too, and the list stays where it is.
  useLayoutEffect(() => {
    window.scrollTo({ top: navigationType === "POP" ? savedScroll(pathname) : 0, behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
