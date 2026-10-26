import { Outlet } from "react-router-dom";

// The educator pages under the top bar (owner's 2A, 2026-10-26): no sidebar, the page gets the full width.
function Educator() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12 text-left">
      <Outlet />
    </main>
  );
}

export default Educator;
