// Shared classes for the learner pages' buttons (owner's refinement A, 2026-10-26): colours change on hover with a
// mouse only, and a press shrinks the button slightly (160 ms) unless the system asks for reduced motion.
const press = "transition-[color,background-color,border-color,transform] duration-150 ease-snappy motion-safe:active:scale-[0.97]";

export const primaryButton = `rounded-full bg-act font-semibold text-white mhover:bg-act-deep disabled:opacity-60 ${press}`;
export const quietButton = `rounded-full border border-line-strong bg-card font-medium text-ink mhover:border-ink/30 ${press}`;

// A card or row coming in on its list's first show (owner's 1A, 2026-10-27): it rises 8 px as it fades in (250 ms);
// with reduced motion it only fades. `delay` is undefined once the list has been seen.
export const entranceProps = (delay) =>
  delay === undefined
    ? { className: "", style: undefined }
    : { className: "motion-safe:animate-card-in motion-reduce:animate-card-fade", style: { animationDelay: `${delay}ms` } };

// "4 lessons · 1 h 5 min": a list of facts with a soft dot between them
export const metaList = "flex flex-wrap items-center gap-x-2 gap-y-1 [&>li+li]:before:mr-2 [&>li+li]:before:text-ink/25 [&>li+li]:before:content-['·']";
