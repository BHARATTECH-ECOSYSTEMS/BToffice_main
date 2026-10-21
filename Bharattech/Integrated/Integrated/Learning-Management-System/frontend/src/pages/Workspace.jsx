import { useEffect } from "react";

const workspaceUrl = import.meta.env.VITE_WORKSPACE_URL || "http://localhost:1420";

export default function Workspace() {
  useEffect(() => {
    window.location.assign(workspaceUrl);
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">Opening Workspace</h1>
      <p className="max-w-md text-sm text-gray-600">
        If the workspace platform does not open automatically, use the button below.
      </p>
      <a
        href={workspaceUrl}
        className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-medium text-white hover:bg-orange-600"
      >
        Open Workspace
      </a>
    </div>
  );
}
