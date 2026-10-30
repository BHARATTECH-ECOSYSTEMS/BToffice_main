import { useEffect } from "react";
import { toastLift } from "../utils/toastLift";

/**
 * Keeps `--toast-lift` on the page up to date: the toasts' distance from the bottom edge, raised above the buttons an
 * open window (role="dialog") has in the toasts' corner, so a toast never covers Mark as watched, Save and the like.
 */
export function useToastLift() {
  useEffect(() => {
    const update = () => {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      const buttons = dialog ? [...dialog.querySelectorAll("button")].map((b) => b.getBoundingClientRect()) : [];
      document.documentElement.style.setProperty("--toast-lift", `${toastLift(window.innerWidth, window.innerHeight, buttons)}px`);
    };
    update();
    // windows open and close by being added to and removed from the page
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
}
