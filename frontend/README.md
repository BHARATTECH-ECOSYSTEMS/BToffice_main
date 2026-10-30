# Bharattech Origin

The site is built around the logo: **a violet sphere with three white threads converging on one point, the origin.**

## Visual system (October 2026, pinned-story pass)

- **3D (`src/gl/Engine.ts`)**: the logo stays one whole sphere. Its three threads are **memory, connection and learning**, and they meet at the origin point; every chapter tells its idea through those threads.
  - **The problem**: the memory thread is wiped, every thread breaks into pieces, the whole mark dulls to slate and freezes, then the threads stop short of the origin and never meet.
  - **The answer**: the memory thread returns, all three meet again, and signals run along them into the origin.
  - **Capabilities**: Understand, Build and Operate are the three threads; the family being read takes its colour while the other two sink into the glaze.
  - `ThreadDial` (`src/components/ThreadDial.tsx`) labels the threads on the stage with what is happening to each.
  - *The globe* still carries **Network** and the About page.
  - Sections drive it with `useFormation(ref, () => ({ key: 'mark', show, broken, apart, focus, tint, flow, grey, pose }))`.
- **Pinned chapters (`src/components/Chapter.tsx`)**: Problem, Answer, Capabilities, How it works and Architecture are several screens tall with a frame that stays put. Scrolling walks the steps; numbered tabs fill as each step is read and jump to it when pressed. Steps cross-fade with a short rise and blur.
- **Architecture**: nine isometric plates, each engraved with what its layer does (app windows, a plan tree, memory on a timeline, a knowledge graph, a lens over imagery, nested boundaries, workers, an accelerator die, India). The plate being read lifts out in colour, beside a card with its role in the groundwater request.
- **Nav glance (`src/components/NavPeek.tsx`)**: hovering a link opens one panel that morphs between sections (research domains with their drawings, the capability families, latest essays, open roles, about), with a caret that follows the link. Hidden on touch and below 1024px.
- **Pages**: Publications fans three covers (each drawn for its essay) and lays posts out so no row has a lone card; Careers deals every role as a deck you can open card by card, then shows roles as illustrated cards; About has drawn principles, a milestone track and numbered values.
- **Colour**: flat fills only. The logo's own violet is the one gradient left.
- **Styles**: `base.css` (tokens, type, nav, footer), `fx.css` (bento, sections, effects), `story.css` (chapters, stack, glance, covers, careers, about; loaded last).

## Run

```bash
npm install
npm run dev     # http://localhost:5174
npm run build
```

## Notes

- Respects `prefers-reduced-motion`; falls back to typography only if WebGL is unavailable.
- Removed from the original on purpose: fabricated stats ("350K+ businesses"), invented testimonials,
  stock photos and the ISO/GDPR/SOC 2 badges. Add the badges back only if the certifications are real.
- The contact form opens the visitor's mail client (there's no backend yet). Career "apply" links do the same.
- Journal articles show the excerpt plus a "full essay coming" note until real article bodies exist.

## Themes and breakpoints

- The site is light only: warm paper, ink type, one colour per chapter.
- `src/styles/site.css` is one stylesheet with tokens at the top. Layouts step down at
  ≤1024px (menu sheet replaces the links), ≤900px (everything stacks; each object sits in a band above its copy)
  and ≤640px (phone).
- Pinned chapters on phones show only the step being read; the "How it works" chain becomes a swipe row.
