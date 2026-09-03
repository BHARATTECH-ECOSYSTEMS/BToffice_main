import { useNavigate, useParams } from "react-router-dom";
import SearchBar from "../../components/students/SearchBar";
import CourseCard from "../../components/students/CourseCard";
import { useCourses } from "../../context/CourseContext";
import { useEffect, useState } from "react";
import { assets } from "../../assets/assets";
import Footer from "../../components/students/Footer";

function CoursesList() {
  const navigate = useNavigate();
  const { query } = useParams();
  const { allCourses } = useCourses();
  const [filteredCourses, setFilteredCourses] = useState(allCourses || []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (allCourses && allCourses.length > 0) {
      query
        ? setFilteredCourses(
            allCourses.filter((course) =>
              course.courseTitle.toLowerCase().includes(query.toLowerCase())
            )
          )
        : setFilteredCourses(allCourses);
    }
  }, [allCourses, query]);
  return (
    <>
      <div className="relative md:px-36 px-8 pt-8 pb-16 text-left bg-gradient-to-b from-indigo-100/70 via-blue-50/30 to-white">
        <div className="bharat-hero-banner px-6 py-10 md:px-12 md:py-14 mb-10">
          <div className="bharat-hero-glow" />
          <div className="bharat-hero-beams" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-2">
                BharatTech LMS
              </p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
                Explore Our <span className="text-indigo-300">Courses</span>
              </h1>
              <p className="text-sm text-white/70 mt-2">
                <span
                  className="text-white hover:underline cursor-pointer"
                  onClick={() => navigate("/")}
                >
                  Home
                </span>{" "}
                / <span>Course List</span>
              </p>
            </div>
            <SearchBar data={query} />
          </div>
        </div>
        {query && (
          <div className="inline-flex items-center gap-4 px-4 py-2 border mt-8 -mb-8 text-gray-600">
            <p>{query}</p>
            <img
              src={assets.cross_icon}
              alt=""
              className="cursor-pointer"
              onClick={() => navigate("/course-list")}
            />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 my-16 gap-3 px-2 md:p-0">
          {filteredCourses.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </div>
      </div>
    
    </>
  );
}

export default CoursesList;
