import type { ReactNode, RefObject } from 'react';

/**
 * The card a section's particle formation lives in (see useStage). The card itself is only a frame:
 * a figure number, the name of the form and a one-line caption; the particles are drawn behind it, clipped to it.
 */
export function Stage({ stageRef, fig, name, caption }: { stageRef: RefObject<HTMLElement>; fig: string; name: string; caption: ReactNode }) {
  return (
    <figure ref={stageRef} className="stage" data-inset="36 20 58 20">
      <span className="stage-fig">Fig. {fig}</span>
      <span className="stage-name">{name}</span>
      <figcaption className="stage-cap">{caption}</figcaption>
    </figure>
  );
}
