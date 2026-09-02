import { Link } from "react-router-dom";
import { Eye, Star } from "lucide-react";
import { useAppConfig } from "../../context/AppContext";
import { calculateRatings } from "../../utils/courseHelpers";
import RatingStars from "../common/RatingStars";

function CourseCard({ course }) {
  const { currency } = useAppConfig();
  const educatorName =
    course.educator?.name || course.educator?.email || "BharatTech";
  const rating = calculateRatings(course);
  const finalPrice = (
    course.coursePrice -
    (course.coursePrice * course.discount) / 100
  ).toFixed(2);

  return (
    <div className="group h-full will-change-transform">
      {/* Card shell — same simple lift used on Resource cards */}
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:shadow-[0_24px_48px_rgba(15,23,42,0.14)]">
        {/* Gradient top bar — matches Resource cards */}
        <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />

        {/* Thumbnail */}
        <Link
          to={`/course/${course._id}`}
          onClick={() => scrollTo(0, 0)}
          className="overflow-hidden"
        >
          <img
            src={course.courseThumbnail}
            alt={course.courseTitle}
            className="aspect-[16/9] w-full object-contain"
          />
        </Link>

        {/* Course details */}
        <div className="flex flex-1 flex-col p-5 text-left">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-500">
            Course
          </p>

          <Link to={`/course/${course._id}`} onClick={() => scrollTo(0, 0)}>
            <h3 className="mb-1.5 line-clamp-2 text-base font-bold tracking-tight text-slate-900 transition-colors duration-200 group-hover:text-blue-700">
              {course.courseTitle}
            </h3>
          </Link>

          <p className="mb-3 text-sm text-slate-500">
            {educatorName.includes("null")
              ? educatorName.split(" ")[0]
              : educatorName}
          </p>

          <div className="mt-auto flex flex-col gap-2 pt-1">
            {/* Rating line */}
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-800">{rating}</p>
              <RatingStars
                rating={rating}
                parentStyles={"flex"}
                imgStyles={"w-3.5 h-3.5"}
              />
              <p className="text-sm text-slate-500">
                ({course.courseRatings.length})
              </p>
            </div>

            {/* Price */}
            <p className="text-lg font-bold text-slate-900">
              {currency}
              {finalPrice}
            </p>

            {/* View button — full width, own row */}
            <Link
              to={`/course/${course._id}`}
              onClick={() => scrollTo(0, 0)}
              className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseCard;
