import { useEffect, useState } from "react";

// Real buttons, so the rating also works from the keyboard and reads out as "Rate 3 out of 5".
function Rating({ initialRating, onRate }) {
  const [rating, setRating] = useState(initialRating || 0);
  const handleRating = (value) => {
    setRating(value);
    if (onRate) onRate(value);
  };

  useEffect(() => {
    if (initialRating) {
      setRating(initialRating);
    }
  }, [initialRating]);
  return (
    <div className="flex items-center gap-0.5 max-md:gap-5">
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        return (
          <button
            type="button"
            key={index}
            aria-label={`Rate ${starValue} out of 5`}
            aria-pressed={starValue === rating}
            className={`tap rounded px-0.5 text-2xl leading-none transition-colors duration-150 ease-snappy ${starValue <= rating ? "text-tangerine" : "text-ink/20 mhover:text-tangerine/60"}`}
            onClick={() => handleRating(starValue)}
          >
            &#9733;
          </button>
        );
      })}
    </div>
  );
}

export default Rating;
