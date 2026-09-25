import { useEffect, useRef } from 'react';
import { useScene } from './Scene';
import type { FormationKey, ScreenAnchor } from './Engine';

/**
 * Calls `draw` every frame with the screen positions of the anchors of whichever
 * of `keys` is on screen (null otherwise) and how settled the morph is (0…1).
 * Use it to pin HTML to live particle structures without React re-renders.
 */
export function useAnchors(keys: FormationKey[], draw: (pts: ScreenAnchor[] | null, settle: number) => void) {
  const { engine } = useScene();
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const keyList = keys.join(',');
  useEffect(() => {
    if (!engine) return;
    const ks = keyList.split(',') as FormationKey[];
    return engine.onFrame(() => {
      const k = ks.find((x) => x === engine.currentKey);
      const pts = k ? engine.anchors(k) : null;
      drawRef.current(pts, pts ? Math.max(0, (engine.settled - 0.5) / 0.5) : 0);
    });
  }, [engine, keyList]);
}
