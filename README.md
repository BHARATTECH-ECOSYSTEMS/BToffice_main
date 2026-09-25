# Bharattech Origin: redesign

A redesign of `CinematicLandingPageDesign(Community)`, built around one idea from the logo:
**three white threads converging on a single point: the origin.**

The whole site runs on **one particle system (22k points, 9k on phones)**. It *is* the logo on
arrival: a purple sphere whose threads are literal voids. As you scroll, those same particles
act out the story:

| Chapter | Formation | What the particles do |
|---|---|---|
| Hero | the mark | Condense from a galaxy into the logo; light travels along the threads into the origin point |
| The problem | mark, silos, frozen, alone | The mark forgets (dissolves), splits into six labelled tools, freezes into rigid cubes, then reaches for its neighbours and never connects |
| Capabilities | orbit | 15 satellites on 3 rings (Understand, Build, Operate); a grouped list to read, one callout pinned to the active satellite |
| Architecture | exploded stack | 9 layers, each with its own pattern; the active layer lifts out of the stack and is tagged in place |
| Network | globe | India in dot-matrix, arcs of light to the world; drag to rotate |
| Laboratory | helix | 6 labelled segments = 6 research domains; opening a domain lights its segment |
| Builders / Journal | field | A calm breathing terrain |
| Finale | the mark | Everything returns to the logo, rising over the horizon |

Inner pages reuse the same system with their own formations, so moving between routes morphs
the scene instead of reloading it. Move the cursor to part the particles; click anywhere to send a pulse.

## Run

```bash
npm install
npm run dev     # http://localhost:5175
npm run build
```

## Structure

- `src/gl/threads.ts`: the logo's thread geometry (drives the 3D sphere, the SVG mark and the favicon)
- `src/gl/formations.ts`: every shape the particles can become
- `src/gl/Engine.ts` + `shaders.ts`: three.js renderer, interruptible morphing, pointer physics, trails
- `src/gl/useAnchors.ts`: pins HTML labels to live particle structures
- `src/gl/Scene.tsx`: `useFormation(ref, target)`: any section declares what the scene becomes while it's in view
- `src/content.ts`: all copy and data in one place
- `src/sections/*`, `src/pages/*`: layout; `src/styles/global.css`: the design system

## Notes

- Respects `prefers-reduced-motion`; falls back to typography only if WebGL is unavailable.
- Removed from the original on purpose: fabricated stats ("350K+ businesses"), invented testimonials,
  stock photos and the ISO/GDPR/SOC 2 badges. Add the badges back only if the certifications are real.
- The contact form opens the visitor's mail client (there's no backend yet). Career "apply" links do the same.
- Journal articles show the excerpt plus a "full essay coming" note until real article bodies exist.
