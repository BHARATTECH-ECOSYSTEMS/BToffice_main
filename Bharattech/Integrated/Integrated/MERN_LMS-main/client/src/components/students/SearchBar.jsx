import { useLocation, useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function SearchBar({ data }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState(data || "");
  const inputRef = useRef(null);

  // Sync input with incoming data
  useEffect(() => {
    setInput(data || "");
  }, [data]);

  // Debounced search when already on course-list
  useEffect(() => {
    if (!location.pathname.startsWith("/course-list")) return;

    const timer = setTimeout(() => {
      const query = input.trim();

      navigate(query ? `/course-list/${encodeURIComponent(query)}` : "/course-list", { replace: true });
    }, 300);

    return () => clearTimeout(timer);
  }, [input, navigate, location.pathname]);

  const onSearchHandler = (e) => {
    e.preventDefault();

    const query = input.trim();

    navigate(query ? `/course-list/${encodeURIComponent(query)}` : "/course-list");
  };

  return (
    <form role="search" onSubmit={onSearchHandler} className="relative w-full max-w-sm">
      <label htmlFor="course-search" className="sr-only">
        Search courses
      </label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      {/* the box's own edge is the focus line: the global *:focus-visible ring would draw a second one 2 px outside it */}
      <input
        ref={inputRef}
        id="course-search"
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search courses"
        className="h-11 w-full rounded-full border border-line-strong bg-card pl-10 pr-11 text-[15px] text-ink transition-colors duration-150 ease-snappy placeholder:text-muted focus-visible:outline-none focus:border-act focus:ring-1 focus:ring-act [&::-webkit-search-cancel-button]:appearance-none"
      />
      {/* Chrome's own clear button is blue whatever the page's colours, so the box draws its own */}
      {input && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setInput("");
            inputRef.current?.focus();
          }}
          className="tap absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-act transition-colors duration-150 ease-snappy hover:bg-act-wash focus-visible:outline-offset-0"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </form>
  );
}

export default SearchBar;
