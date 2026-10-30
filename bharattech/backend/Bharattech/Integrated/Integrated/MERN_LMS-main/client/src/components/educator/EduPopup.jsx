import { useState } from "react";
import { toast } from "react-toastify";
import { primaryButton, quietButton } from "../students/ui";

const EduPopup = ({ message, onSubmit, onClose }) => {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const title = value.trim();
    if (!title) {
      toast.error("Give the chapter a title.");
      return;
    }
    onSubmit(title);
    onClose();
  };
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
      <div role="dialog" aria-modal="true" aria-labelledby="edu-popup-title" className="flex w-[90%] max-w-md flex-col gap-4 rounded-2xl bg-card p-6 shadow-2xl">
        <h2 id="edu-popup-title" className="font-display text-xl font-semibold text-ink">
          {message}
        </h2>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit();
              }
            }}
            placeholder="Chapter title"
            aria-label="Chapter title"
            className="h-11 rounded-xl border border-line-strong bg-card px-4 text-[15px] text-ink focus-visible:outline-none focus:ring-1 focus:ring-act placeholder:text-muted focus:border-act"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className={`tap px-4 py-2 text-sm ${quietButton}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className={`tap px-4 py-2 text-sm ${primaryButton}`}
            >
              Add chapter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EduPopup;
