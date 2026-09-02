import { Link } from "react-router-dom";
import CourseCard from "./CourseCard";
import { useCourses } from "../../context/CourseContext";

function CoursesSection() {
  const { allCourses } = useCourses();
  return (
    <div className="md:px-8 w-[80%] pb-10">
      <div className="grid grid-cols-auto px-4 md:px-0 md:my-16 my-10 gap-4 auto-rows-fr">
        {allCourses?.slice(0, 4).map((course, i) => {
          return <CourseCard course={course} key={i} />;
        })}
      </div>

      <Link
        to={"/course-list"}
        className="px-10 py-3  rounded-md text-white bg-blue-600/70 hover:bg-blue-600/90"
      >
        Show all courses
      </Link>
    </div>
  );
}

export default CoursesSection;
