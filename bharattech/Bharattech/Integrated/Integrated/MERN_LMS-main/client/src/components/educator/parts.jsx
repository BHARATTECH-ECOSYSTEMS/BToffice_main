import { primaryButton } from "../students/ui";

// Shared pieces of the educator pages (owner's 1A 3A, 2026-10-26): the same type, colours and tables as the
// learner side, with column names in plain sentence case.

export function PageHead({ title, children, action }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <h1 className="font-display text-[40px] font-bold leading-[1.08] tracking-[-0.02em] text-ink">{title}</h1>
        {children && <p className="mt-2 text-[15px] text-muted">{children}</p>}
      </div>
      {action}
    </header>
  );
}

export function LearnerCell({ student }) {
  const name = student?.name || "Learner";
  return (
    <div className="flex items-center gap-3">
      {student?.imageUrl ? (
        <img src={student.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-act-wash text-sm font-semibold text-act-deep">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{name}</p>
        {student?.email && <p className="truncate text-[13px] text-muted">{student.email}</p>}
      </div>
    </div>
  );
}

/** Loading and failed states for a page's first read. */
export function FirstLoad({ status, retry, what }) {
  if (status === "loading") return <p className="mt-8 text-muted">Loading {what}…</p>;
  return (
    <div className="mt-8 rounded-2xl border border-line bg-card p-6">
      <p className="text-ink">Your {what} didn't load. Check your connection, then try again.</p>
      <button type="button" onClick={retry} className={`mt-3 px-5 py-2 text-sm ${primaryButton}`}>
        Try again
      </button>
    </div>
  );
}

// Below 768 px the tables cut off their right-hand columns (owner's E2A, 2026-10-27), so there each row stacks
// instead: no header row, the row lays out its own cells, and the cells lose their padding to the row.
export const tableClass = "w-full border-collapse text-left text-[15px] max-md:block";
export const tableHead = "border-b border-line max-md:hidden";
export const tableBody = "divide-y divide-line max-md:block";
export const headCell = "px-5 py-3 text-[13px] font-medium text-muted";
export const bodyCell = "px-5 py-4 align-middle max-md:p-0";
// an enrollment: learner, course, progress, then the date, one under the other (beside the learner it cut their name)
export const enrollmentRow = "max-md:grid max-md:gap-y-2 max-md:px-5 max-md:py-4";
// a course: cover and title, then learners and the publish date under the title
export const courseRow = "max-md:flex max-md:flex-wrap max-md:px-5 max-md:py-4";
