# Bharattech Origin: redesign

A redesign of `CinematicLandingPageDesign(Community)`, built around one idea from the logo:
**three white threads converging on a single point: the origin.**

The **mark** is the one particle moment: a purple sphere whose threads are literal voids, resolving on
arrival and again in the finale. Everything in between is quiet and explains itself: each section has a
small flat diagram whose **motion is the explanation**. Notes drop into memory and are recalled, six
tools try to pass information and hit walls, a request travels down nine layers and intelligence comes
back up, something learned on a phone reaches the sovereign core and every other node.

| Section | What moves |
|---|---|
| What we build | Three diagrams: notes kept and recalled across sessions, six systems sharing one memory, a curve that keeps rising while a frozen model stays flat |
| The problem | Four diagrams: a session that ends and leaves the next one empty, tools blocked by walls, a world that outgrows a frozen model, agents repeating the same work |
| Capabilities | Fifteen capabilities in three tabs, one group at a time |
| How it works | One request through five stations; advances on its own and is clickable |
| Architecture | Nine-layer stack; a request travels down and intelligence comes back up |
| Network | Learning travels device → data centre → sovereign core → everyone; hover a pillar to highlight its part |
| Laboratory / Audiences | One diagram per research domain and per audience, each showing what it does |

Every diagram is a pure function of time and cursor (`src/viz/`), so it can be painted at any moment,
follows the theme through CSS variables, runs only while on screen and holds a still frame for
reduced motion. Hover and click interactions are part of the drawing, not bolted on.

## Run

```bash
npm install
npm run dev     # http://localhost:5175
npm run build
```

## Structure

- `src/viz/`: the diagram kit. `Diagram.tsx` (clock, cursor, visibility), `atoms.tsx` (chips, labels, panels, icons),
  `math.ts` (easing and windows), then one file per set: `intro`, `problem`, `network`, `domains`, `audiences`
- `src/gl/`: the particle mark. `threads.ts` (logo geometry), `formations.ts`, `Engine.ts` + `shaders.ts`, `Scene.tsx`
  (`useFormation(ref, target)`); sections that do not want particles declare `{ key: 'field', params: { alpha: 0 } }`
- `src/content.ts`: all copy and data in one place
- `src/sections/*`, `src/pages/*`: layout; `src/styles/global.css`: the design system (Geist, 12-column grid,
  brand palette tokens, one section-header pattern)
- `reel.html` + `src/reel/`: a deterministic export page for one diagram

## Palette

Violet leads (`--brand-*`, fixed so tone rotation never recolours Origin). Tango `#FF8643` and pitch `#F59E00`
are the supporting accents (`--tango-*`, `--pitch-*`); cultured `#F8F7F3` is the light background and the ink on dark.
Cards rotate violet, tango, pitch by re-pointing `--accent*` for the card.

## Video

`npm run reels` renders every diagram, in both themes, to a looping MP4 plus poster in `public/media/`
(git-ignored) with Playwright and ffmpeg (the `motion-render` skill). `npm run reels -- remember dark` renders one.

## Notes

- Respects `prefers-reduced-motion`; falls back to typography only if WebGL is unavailable.
- Removed from the original on purpose: fabricated stats ("350K+ businesses"), invented testimonials,
  stock photos and the ISO/GDPR/SOC 2 badges. Add the badges back only if the certifications are real.
- The contact form opens the visitor's mail client (there's no backend yet). Career "apply" links do the same.
- Journal articles show the excerpt plus a "full essay coming" note until real article bodies exist.

## Themes and breakpoints

- Dark is the default; the sun/moon button in the nav switches to light and the choice is remembered
  (`src/theme.ts`). Diagrams follow through CSS variables; the particle mark follows the engine theme.
- `src/styles/global.css` is one stylesheet with light/dark tokens at the top. Layouts step down at
  ≤1100px (tablet), ≤900px (compact: everything stacks) and ≤560px (phone). On phones "How it works"
  becomes a vertical timeline.
