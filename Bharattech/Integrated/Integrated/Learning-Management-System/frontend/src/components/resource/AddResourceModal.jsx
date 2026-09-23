import React, { useRef, useEffect } from "react";
import { Link2, X } from "lucide-react";
import { Btn, Eyebrow, IconBadge, Input, Label, cardShell, cx } from "../ui/ButtonPrimitive";

export default function AddResourceModal({
  isOpen,
  onClose,
  title,
  setTitle,
  link,
  setLink,
  handleAdd,
}) {
  const titleInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    titleInputRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cx(
          cardShell,
          "w-full max-w-md hover:-translate-y-0 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
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
              <IconBadge icon={Link2} className="bg-violet-50 text-blue-600" />
              <div>
                <Eyebrow className="text-blue-500">Resource</Eyebrow>
                <h2 id="add-resource-title" className="text-lg font-bold tracking-tight text-slate-900">
                  Add New Resource
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
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
              disabled={!title?.trim() || !link?.trim()}
              className="flex-1"
            >
              Save Resource
            </Btn>
            <Btn variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
