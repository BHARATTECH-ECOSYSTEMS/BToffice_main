import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * The navbar's Menu panel below 768 px (learner L1A, educator E1A, 2026-10-27): it closes on a new page, on Escape,
 * and on a tap outside the navbar. `navRef` goes on the <nav>, so the Menu button and the panel count as inside.
 */
export function usePhoneMenu() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onPointer = (event) => {
      if (!navRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  return { menuOpen, setMenuOpen, navRef };
}
