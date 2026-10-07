// The opening plays once a session, on the first page (index.html decides, before the first paint, by setting
// html.intro-on). `opening` resolves as the page is uncovered: entrances and the particle mark wait for it.

let uncover!: () => void;
export const opening = new Promise<void>((resolve) => (uncover = resolve));
export { uncover };

/** Whether the opening was set to play on this load (read once, before Opening removes the class). */
export const introPlanned = typeof document !== 'undefined' && document.documentElement.classList.contains('intro-on');

/** True only for a browser refresh, not for the app's client-side route changes. */
export const reloadedDocument = () =>
  typeof performance !== 'undefined' &&
  (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type === 'reload';
