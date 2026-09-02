import { useLocation, useNavigate } from "react-router-dom";
import { assets } from "../../assets/assets";
import { useEffect, useState } from "react";

function SearchBar({ data }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState(data || "");

  // Sync input with incoming data
  useEffect(() => {
    setInput(data || "");
  }, [data]);

  // Debounced search when already on course-list
  useEffect(() => {
    if (!location.pathname.startsWith("/course-list")) return;

    const timer = setTimeout(() => {
      const query = input.trim();

      navigate(query ? `/course-list/${query}` : "/course-list");
    }, 300);

    return () => clearTimeout(timer);
  }, [input, navigate, location.pathname]);

  const onSearchHandler = (e) => {
    e.preventDefault();

    const query = input.trim();

    navigate(query ? `/course-list/${query}` : "/course-list");
  };

  return (
    <form
      onSubmit={onSearchHandler}
      className="
        relative z-10
        flex h-12 w-full max-w-xl
        items-center
        rounded
        border border-gray-200
        bg-white
        transition-all duration-300
        focus-within:border-indigo-600
        focus-within:shadow-lg
        focus-within:shadow-indigo-600/20

        sm:h-13
        md:h-14

        md:w-2/4
        md:focus-within:w-3/4
      "
    >
      {/* Search icon */}
      <img
        src={assets.search_icon}
        alt=""
        aria-hidden="true"
        className="
          ml-3
          h-5 w-5
          shrink-0
          object-contain
          sm:ml-4
        "
      />

      {/* Input */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search for courses"
        className="
          min-w-0
          flex-1
          bg-transparent
          px-2
          text-sm
          text-gray-700
          outline-none
          placeholder:text-gray-400

          sm:px-3
          sm:text-base
        "
      />

      {/* Search button */}
      <button
        type="submit"
        className="
          m-1
          shrink-0
          rounded
          bg-indigo-700
          px-4
          py-3
          text-sm
          font-medium
          text-white
          transition-colors
          duration-200
          hover:bg-indigo-600
          active:bg-indigo-800

          sm:px-5
          md:px-10
        "
      >
        Search
      </button>
    </form>
  );
}

export default SearchBar;
