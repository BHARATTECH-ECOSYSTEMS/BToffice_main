// Shared classes for the learner pages' buttons (owner's refinement A, 2026-10-26): colours change on hover with a
// mouse only, and a press shrinks the button slightly (160 ms) unless the system asks for reduced motion.
const press = "transition-[color,background-color,border-color,transform] duration-150 ease-snappy motion-safe:active:scale-[0.97]";

export const primaryButton = `rounded-full bg-act font-semibold text-white mhover:bg-act-deep disabled:opacity-60 ${press}`;
export const quietButton = `rounded-full border border-line-strong bg-card font-medium text-ink mhover:border-ink/30 ${press}`;
