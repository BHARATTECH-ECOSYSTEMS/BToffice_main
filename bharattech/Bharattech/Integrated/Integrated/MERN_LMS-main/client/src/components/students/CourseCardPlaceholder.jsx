/** A course card's shape while the courses load (owner's refinement): still, so nothing moves on its own. */
function CourseCardPlaceholder() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card" aria-hidden="true">
      <div className="aspect-video bg-ink/[0.06]" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="h-4 w-4/5 rounded bg-ink/[0.07]" />
        <div className="h-3 w-2/5 rounded bg-ink/[0.05]" />
        <div className="mt-6 h-3 w-1/2 rounded bg-ink/[0.05]" />
      </div>
    </div>
  );
}

/** The grid's worth of placeholders, with one line for screen readers. */
export function CourseGridPlaceholder({ count = 8 }) {
  return (
    <>
      <p className="sr-only" role="status">
        Loading courses…
      </p>
      {Array.from({ length: count }, (_, i) => (
        <CourseCardPlaceholder key={i} />
      ))}
    </>
  );
}

export default CourseCardPlaceholder;
