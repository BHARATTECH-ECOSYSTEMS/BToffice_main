/**
 * Opening a post from the Blog's book: a copy of the post's cover is lifted off the page, the article mounts under
 * it, and the copy flies into the article's own cover ([data-morph-target]) before handing over to it.
 *
 * A copy rather than the View Transitions API: the site's route sweep (RouteSweep.tsx) owns every link click and
 * the new page resets its scroll in an effect, after a view transition would already have taken its picture.
 */

const FLY_MS = 680;
const FADE_MS = 160;
/** How long to wait for the article's cover to appear before giving up and letting the page show as it is. */
const WAIT_FRAMES = 40;

export function morphCover(from: HTMLElement, go: () => void) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const main = document.getElementById('main');
  if (reduced || !main || !from.animate) return go();

  const start = from.getBoundingClientRect();
  const radius = getComputedStyle(from).borderRadius;
  const ghost = from.cloneNode(true) as HTMLElement;
  ghost.setAttribute('aria-hidden', 'true');
  ghost.classList.add('cover-ghost');
  Object.assign(ghost.style, { left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px`, height: `${start.height}px` });
  document.body.appendChild(ghost);

  const ease = getComputedStyle(document.documentElement).getPropertyValue('--ease-expo').trim() || 'ease-out';
  main.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: 'ease-out', fill: 'forwards' }).finished.then(() => {
    go();
    let frames = 0;
    const land = () => {
      const target = document.querySelector<HTMLElement>('[data-morph-target]');
      // the new page resets its scroll to the top in an effect; measured before that, the landing spot is wherever
      // the old page was scrolled to, and the cover flies off the top of the window
      if (!target || window.scrollY > 1) {
        if (frames++ < WAIT_FRAMES) return requestAnimationFrame(land);
        ghost.remove();
        return;
      }
      target.style.visibility = 'hidden';
      const end = target.getBoundingClientRect();
      const dx = end.left - start.left;
      const dy = end.top - start.top;
      document
        .getElementById('main')
        ?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: 120, easing: 'ease-out', fill: 'backwards' });
      // width and height rather than a scale, so the drawing inside is redrawn at its new size instead of stretched
      ghost
        .animate(
          [
            { transform: 'translate(0, 0)', width: `${start.width}px`, height: `${start.height}px`, borderRadius: radius },
            {
              transform: `translate(${dx}px, ${dy}px)`,
              width: `${end.width}px`,
              height: `${end.height}px`,
              borderRadius: getComputedStyle(target).borderRadius,
            },
          ],
          { duration: FLY_MS, easing: ease, fill: 'forwards' },
        )
        .finished.then(() => {
          target.style.visibility = '';
          ghost.remove();
        });
    };
    requestAnimationFrame(land);
  });
}
