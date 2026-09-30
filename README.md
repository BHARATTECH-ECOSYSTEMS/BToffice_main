# Bharattech Origin: redesign

A redesign of `CinematicLandingPageDesign(Community)`, built around one idea from the logo:
**three white threads converging on a single point: the origin.**

The **mark** is a purple sphere whose threads are literal voids. It resolves on arrival, then travels with you.
On wide screens the page splits: the story on the left, and on the right one sticky panel where the same particles
re-form, section by section, into a flat dot-matrix figure of something familiar (`src/gl/figures.ts`): the mark,
four puzzle pieces that do not fit, an app grid, a route of five stations, a building of nine floors, India with
lines out to the world, a molecule of six domains, six people around one core, tables with empty seats for the open
roles, a stack of notes, a conversation. Labels are pinned to each figure, the caption follows the section, and on
phones each section carries its own figure card. The mark rises again in the finale. Everything else is quiet and explains itself: each section has a
small flat diagram whose **motion is the explanation**. Notes drop into memory and are recalled, six
tools try to pass information and hit walls, a request travels down nine layers and intelligence comes
back up, something learned on a phone reaches the sovereign core and every other node.

| Section | What moves |
|---|---|
| What we build | Three diagrams: notes kept and recalled across sessions, six systems sharing one memory, a curve that keeps rising while a frozen model stays flat |
| The problem | Four diagrams: a session that ends and leaves the next one empty, tools blocked by walls, a world that outgrows a frozen model, agents repeating the same work |
| Capabilities | Fifteen capabilities in three tabs, one group at a time |
| How it works | One request through five stations; advances on its own and is clickable |
| Architecture | Nine layers, each its own shape and glyph (capsule, arrow, disk, hexagon, page, shield, lanes, chip, dome) in three colour families; the panel's building prints every floor as a different structure |
| Network | Learning travels device → data centre → sovereign core → everyone; the panel shows a dotted globe (continents, graticule, India lit, orbits, moving arcs) that sways on its own and turns when dragged |
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
  (`useFormation(ref, target)`; `useStage(ref, key, meta)` gives a section its figure, drawn in `StagePanel` on wide screens
  and in its `<Stage>` card on phones);
  sections that do not want particles declare `{ key: 'field', params: { alpha: 0 } }`
- `src/content.ts`: all copy and data in one place
- `src/styles/glass.css`: chapter palettes, aurora, liquid-glass surfaces, the chapter rail, the finale and the architecture shapes (loaded after `global.css`)
- `src/sections/*`, `src/pages/*`: layout; `src/styles/global.css`: the design system (Geist, 12-column grid,
  brand palette tokens, one section-header pattern)
- `reel.html` + `src/reel/`: a deterministic export page for one diagram

## Palette

Violet leads (`--brand-*`, fixed so tone rotation never recolours Origin). Tango `#FF8643` and pitch `#F59E00`
are the supporting accents (`--tango-*`, `--pitch-*`); cultured `#F8F7F3` is the light background and the ink on dark.
Cards rotate violet, tango, pitch by re-pointing `--accent*` for the card.

Every home section names a two-colour palette (`data-room` lead, `data-room2` partner). `Rooms.tsx` puts the one in view
on `<html>`, and `src/styles/glass.css` eases the page aurora, headline accents, buttons, the panel and the particles
(`Engine.setTone`) to it. Surfaces are liquid glass: frosted, rimmed, with a highlight that follows the cursor.
The chapter rail on the right is one straight track of dots, one per chapter, in each chapter's colour.

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
