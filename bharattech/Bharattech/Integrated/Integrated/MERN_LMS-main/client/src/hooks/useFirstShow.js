import { useEffect, useState } from "react";
import { isFirstShow, markShown } from "../utils/entrance";

/** True if this list is showing for the first time in this tab; `ready` once its real items (not placeholders) are on screen. */
export function useFirstShow(key, ready) {
  const [first] = useState(() => isFirstShow(key));

  useEffect(() => {
    if (ready) markShown(key);
  }, [key, ready]);

  return first;
}
