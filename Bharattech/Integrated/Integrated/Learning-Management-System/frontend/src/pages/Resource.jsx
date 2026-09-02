import {
  ExternalLink,
  Trash2,
  Plus,
  UserPlus,
  Download,
  Loader2,
  X,
  Code2,
  Link2,
  AppWindow,
  Command,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef, forwardRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../LMS/context/AuthContext";
import api from "../api/axios";

const BHARATTECH_APP_URL = "bharattech://open";
const BHARATTECH_DOWNLOAD_URL = "/downloads/BharatTech_0.53.0_x64-setup.exe";
const BHARATTECH_INSTALLER_NAME = "BharatTech-Setup.exe";

/* ---------------- SHARED UI PRIMITIVES ---------------- */
// Small local primitives so every button/input/card in this file shares
// the exact same radius, spacing and transition language.

const cx = (...classes) => classes.filter(Boolean).join(" ");

const Btn = ({
  as: Comp = "button",
  variant = "primary",
  size = "md",
  className,
  disabled,
  children,
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
  };
  const variants = {
    primary:
      "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/25 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-600/30 focus-visible:ring-blue-500",
    outline:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400",
    outlineBlue:
      "border-2 border-blue-500 bg-white text-blue-700 hover:bg-blue-50 focus-visible:ring-blue-400",
    danger:
      "border border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100 focus-visible:ring-red-400",
    subtle:
      "bg-gradient-to-br from-slate-50 to-slate-200 text-slate-600 hover:from-slate-100 hover:to-slate-300 focus-visible:ring-slate-400",
    ghost: "text-slate-500 hover:bg-slate-100 focus-visible:ring-slate-400",
  };
  return (
    <Comp
      disabled={disabled}
      className={cx(base, sizes[size], variants[variant], className)}
      {...props}
    >
      {children}
    </Comp>
  );
};

const Input = forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cx(
      "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

const Label = ({ children }) => (
  <label className="mb-1.5 block text-xs font-semibold text-slate-500">
    {children}
  </label>
);

const Eyebrow = ({ children, className }) => (
  <p
    className={cx(
      "mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
      className,
    )}
  >
    {children}
  </p>
);

const IconBadge = ({ icon: Icon, className }) => (
  <div
    className={cx(
      "flex h-10 w-10 items-center justify-center rounded-xl",
      className,
    )}
  >
    <Icon className="h-5 w-5" />
  </div>
);

const Select = ({ className, children, ...props }) => (
  <select
    className={cx(
      "w-full appearance-none rounded-xl border border-slate-300 bg-white bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2364748b%22><path d=%22M5.5 7.5l4.5 4.5 4.5-4.5%22 stroke=%22%2364748b%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-[length:18px] bg-[right_0.65rem_center] bg-no-repeat px-3.5 py-2.5 pr-9 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",
      className,
    )}
    {...props}
  >
    {children}
  </select>
);

/* ---------------- MAIN COMPONENT ---------------- */

const Resource = () => {
  const { hasRole, loading: authLoading, keycloak } = useAuth();

  const [resources, setResources] = useState([]);
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedUser, setSelectedUser] = useState({});
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState({}); // Track delete loading states

  const isAdmin = hasRole("Admin");
  const abortControllerRef = useRef(null);

  /* ---------------- LOAD RESOURCES ---------------- */
  const loadResources = useCallback(async (signal) => {
    try {
      setError(null);
      const res = await api.get("/resources", { signal });
      setResources(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Resources load error:", err);
      setResources([]);
      setError("Failed to load resources");
      toast.error("Failed to load resources");
    }
  }, []);

  const openCoder = useCallback(async () => {
    let token =
      keycloak?.token ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");

    if (keycloak?.authenticated) {
      try {
        await keycloak.updateToken(30);
        token = keycloak.token || token;
      } catch (error) {
        console.warn("Could not refresh BharatTech launch token", error);
      }
    }

    const params = new URLSearchParams({ source: "lms" });
    if (token) {
      params.set("token", token);
    }

    window.location.href = `${BHARATTECH_APP_URL}?${params.toString()}`;
    toast.success("Opening BharatTech Coding Workspace app...");
  }, [keycloak]);

  const downloadBharatTechApp = useCallback(() => {
    const linkElement = document.createElement("a");
    linkElement.href = BHARATTECH_DOWNLOAD_URL;
    linkElement.download = BHARATTECH_INSTALLER_NAME;
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    toast.success("BharatTech app installer download started.");
  }, []);

  const loadUsers = useCallback(
    async (signal) => {
      if (!isAdmin) return;
      try {
        const res = await api.get("/user", { signal });
        setUsers(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Users load error:", err);
        setUsers([]);
      }
    },
    [isAdmin],
  );

  const loadPageData = useCallback(
    async (signal) => {
      setPageLoading(true);
      setError(null);

      await Promise.allSettled([loadResources(signal), loadUsers(signal)]);

      setPageLoading(false);
    },
    [loadResources, loadUsers],
  );

  /* ---------------- INIT ---------------- */
  useEffect(() => {
    if (authLoading) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    loadPageData(controller.signal);

    return () => {
      controller.abort();
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    };
  }, [authLoading, loadPageData]);

  /* ---------------- CLEANUP ---------------- */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const retryLoad = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    loadPageData(controller.signal);
  };

  /* ---------------- ACTIONS ---------------- */
  const handleDelete = async (id) => {
    if (isDeleting[id]) return; // Prevent double clicks

    setIsDeleting((prev) => ({ ...prev, [id]: true }));

    try {
      await api.delete(`/resources/delete/${id}`);
      setResources((prev) => prev.filter((r) => r._id !== id));
      toast.success("Deleted successfully");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Delete failed");
    } finally {
      setIsDeleting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleAdd = async () => {
    const trimmedTitle = title?.trim();
    const trimmedLink = link?.trim();

    if (!trimmedTitle || !trimmedLink) {
      toast.error("Title and link required");
      return;
    }

    try {
      const res = await api.post("/resources", {
        title: trimmedTitle,
        link: trimmedLink,
      });
      if (res?.data?._id) {
        setResources((prev) => [res.data, ...prev]);
        setTitle("");
        setLink("");
        setIsAdding(false);
        toast.success("Resource added");
      } else {
        throw new Error("Invalid response");
      }
    } catch (err) {
      console.error("Add error:", err);
      toast.error(err?.response?.data?.message || "Failed to add resource");
    }
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setTitle("");
    setLink("");
  };

  const titleInputRef = useRef(null);

  useEffect(() => {
    if (!isAdding) return;
    titleInputRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape") cancelAdd();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdding]);

  const assignResource = async (resourceId) => {
    const userId = selectedUser[resourceId];
    if (!userId) {
      toast.error("Select a user first");
      return;
    }

    try {
      await api.post(`/resources/${resourceId}/assign`, { userId });
      toast.success("Assigned successfully");
      setSelectedUser((prev) => ({ ...prev, [resourceId]: "" }));
    } catch (err) {
      console.error("Assign error:", err);
      toast.error(err?.response?.data?.message || "Assignment failed");
    }
  };

  /* ---------------- LOADING ---------------- */
  if (authLoading || pageLoading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-base font-medium text-slate-500">
          Loading resources...
        </p>
      </div>
    );
  }

  /* ================= UI ================= */
  const cardShell =
    "flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]  !transition-all !duration-500 !ease-out overflow-hidden hover:-translate-y-2  hover:shadow-[0_24px_48px_rgba(15,23,42,0.14)]";

  return (
    <div className="p-3 sm:p-6">
      <Toaster position="bottom-right" />

      {/* HERO */}
      <header className="bharat-hero-banner relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 shadow-md md:p-8">
        <div className="bharat-hero-glow" />
        <div className="bharat-hero-beams" />

        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-200">
                BharatTech Platform
              </span>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Resources
            </h1>
            <p className="mt-2 text-xs text-blue-100/80 md:text-sm">
              Manage all resources for the BharatTech Platform
            </p>
          </div>

          {isAdmin && (
            <Btn
              variant="outlineBlue"
              onClick={() => setIsAdding(true)}
              disabled={isAdding}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs cursor-pointer font-semibold"
            >
              <Plus className="h-3.5 w-3.5 text-blue-700" />
              <span>Add Resource</span>
            </Btn>
          )}
        </div>
      </header>
      {/* ERROR BANNER */}
      {error && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-600">{error}</p>
          <Btn variant="danger" size="sm" onClick={retryLoad}>
            Retry
          </Btn>
        </div>
      )}

      {/* EMPTY STATE */}
      {resources.length === 0 && (
        <p className="mb-2 text-sm text-slate-500">
          {isAdmin
            ? "No resources yet — add one to get started."
            : "No resources available right now."}
        </p>
      )}

      {/* GRID */}
      <div className="mt-3  grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* CODER CARD */}
        <div className={cardShell}>
          <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
          <div className="flex h-full flex-col p-5">
            <IconBadge icon={Code2} className="mb-4 bg-blue-50 text-blue-600" />
            <Eyebrow className="text-blue-500">Tool</Eyebrow>
            <h3 className="mb-1.5 text-[17px] font-bold tracking-tight text-slate-900">
              Coder
            </h3>
            <p className="mb-5 text-sm leading-relaxed text-slate-500">
              Open the BharatTech Coding Workspace
            </p>

            <div className="mt-auto flex flex-col gap-2.5">
              <Btn variant="primary" onClick={openCoder} className="w-full">
                Open
              </Btn>
              <p className="py-3.5  text-center text-xs font-medium text-slate-500">
                Don't have an app yet?
              </p>
              <Btn
                variant="outline"
                onClick={downloadBharatTechApp}
                className="w-full"
              >
                <Download className="h-3.5 w-3.5" />
                Install / Update app
              </Btn>

              {/* Platform compatibility line — fills the gap, adds useful info */}
              <div className="flex items-center justify-center gap-3 pt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <AppWindow className="h-3.5 w-3.5" />
                  Windows
                </span>
                <span className="h-3 w-px bg-slate-200" />
                <span className="flex items-center gap-1">
                  <Command className="h-3.5 w-3.5" />
                  macOS
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* RESOURCE CARDS */}
        {resources.map((r) => (
          <div key={r?._id} className={cardShell}>
            <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
            <div className="flex h-full flex-col p-5">
              <IconBadge
                icon={Link2}
                className="mb-4 bg-blue-50 text-blue-600"
              />
              <Eyebrow className="text-blue-500">Resource</Eyebrow>
              <h3 className="mb-1.5 text-base font-bold tracking-tight text-slate-900">
                {r?.title || "Untitled"}
              </h3>
              <p className="mb-5 min-h-[20px] truncate text-sm text-slate-500">
                {r?.link || "No link provided"}
              </p>

              <div className="mt-auto flex items-center gap-2.5">
                <Btn
                  variant="primary"
                  onClick={() => window.open(r?.link, "_blank")}
                  className="flex-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </Btn>

                {isAdmin && (
                  <Btn
                    variant="danger"
                    onClick={() => handleDelete(r._id)}
                    disabled={isDeleting[r._id]}
                    className="flex-1"
                  >
                    {isDeleting[r._id] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {isDeleting[r._id] ? "Deleting" : "Delete"}
                  </Btn>
                )}
              </div>

              {/* ASSIGN SECTION */}
              {isAdmin && (
                <div className="mt-3.5 flex flex-col gap-2.5 border-t border-slate-100 pt-3.5">
                  <div>
                    <Label>Assign user</Label>
                    <Select
                      value={selectedUser[r._id] || ""}
                      onChange={(e) =>
                        setSelectedUser((prev) => ({
                          ...prev,
                          [r._id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select user</option>
                      {users.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.fullName || u.email}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <Btn
                    variant="subtle"
                    size="sm"
                    onClick={() => assignResource(r._id)}
                    disabled={!selectedUser[r._id]}
                    className="w-full py-2.5"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Assign
                  </Btn>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ADD RESOURCE MODAL */}
      {isAdding && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={cancelAdd}
        >
          <div
            className={cx(
              cardShell,
              "w-full max-w-md hover:-translate-y-0 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]",
            )}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-resource-title"
          >
            <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
            <div className="p-6">
              <div className="mb-5 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <IconBadge
                    icon={Link2}
                    className="bg-violet-50 text-blue-600"
                  />
                  <div>
                    <Eyebrow className="text-blue-500">Resource</Eyebrow>
                    <h2
                      id="add-resource-title"
                      className="text-lg font-bold tracking-tight text-slate-900"
                    >
                      Add New Resource
                    </h2>
                  </div>
                </div>
                <button
                  onClick={cancelAdd}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    ref={titleInputRef}
                    value={title || ""}
                    onChange={(e) => setTitle(e.target.value || "")}
                    placeholder="e.g. React Documentation"
                  />
                </div>
                <div>
                  <Label>Link</Label>
                  <Input
                    value={link || ""}
                    onChange={(e) => setLink(e.target.value || "")}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Btn
                  variant="primary"
                  onClick={handleAdd}
                  disabled={!title.trim() || !link.trim()}
                  className="flex-1"
                >
                  Save Resource
                </Btn>
                <Btn variant="outline" onClick={cancelAdd} className="flex-1">
                  Cancel
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resource;
