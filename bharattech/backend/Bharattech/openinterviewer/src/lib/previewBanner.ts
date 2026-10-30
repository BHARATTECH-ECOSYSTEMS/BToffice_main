// When the "Preview Mode - Participant View" bar shows (owner's I1A, 2026-10-27): during the researcher's own Preview
// only. A candidate always comes in through their link, which the page keeps as participantToken; a Preview has none.

const PARTICIPANT_PAGES = ['/consent', '/interview', '/synthesis', '/export'];

export function showsPreviewBanner({
  viewMode,
  participantToken,
  pathname
}: {
  viewMode: string;
  participantToken: string | null;
  pathname: string | null;
}) {
  if (viewMode !== 'participant' || participantToken) return false;
  return PARTICIPANT_PAGES.some((page) => pathname?.startsWith(page));
}
