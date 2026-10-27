// Going back from a course (owner's 1A-4A, 2026-10-27): the back link returns to the list the course was opened from
// (a card passes its list as `state.from`), and that list comes back scrolled where you left it.

export const isListPath = (pathname) =>
  pathname === "/" || pathname === "/course-list" || (typeof pathname === "string" && pathname.startsWith("/course-list/"));

const labelOf = (pathname) => (pathname === "/" ? "Home" : pathname === "/course-list" ? "All courses" : "Search results");

export function backLink(state) {
  const from = state?.from;
  if (isListPath(from)) return { back: true, to: from, label: labelOf(from) };
  return { back: false, to: "/course-list", label: "All courses" };
}

// per tab, like the cards' first show: a reload starts every list at the top
const scrolled = new Map();

export const rememberScroll = (pathname, y) => {
  if (Number.isFinite(y) && y >= 0) scrolled.set(pathname, y);
};
export const savedScroll = (pathname) => scrolled.get(pathname) ?? 0;
