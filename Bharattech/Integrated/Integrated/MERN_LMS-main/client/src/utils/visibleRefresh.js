const REFRESH_MS = 15000;

/**
 * Calls `refresh` every 15 seconds while the page is in view, and once as soon as it comes back into view; a hidden
 * tab asks the server nothing. Answers a function that stops it. `page` is for tests.
 */
export function refreshWhileVisible(refresh, { doc = document, win = window } = {}) {
  const timer = win.setInterval(() => {
    if (!doc.hidden) refresh();
  }, REFRESH_MS);
  const onVisibility = () => {
    if (!doc.hidden) refresh();
  };
  doc.addEventListener("visibilitychange", onVisibility);
  return () => {
    win.clearInterval(timer);
    doc.removeEventListener("visibilitychange", onVisibility);
  };
}
