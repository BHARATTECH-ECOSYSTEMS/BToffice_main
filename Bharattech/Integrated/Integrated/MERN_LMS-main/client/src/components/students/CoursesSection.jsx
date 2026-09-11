import { Link } from "react-router-dom";
import CourseCard from "./CourseCard";
import { useCourses } from "../../context/CourseContext";

function CoursesSection() {
  const { allCourses } = useCourses();

  return (
    <div className="w-full pb-10">
      <div className="w-[80%] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-10">
        {allCourses?.slice(0, 4).map((course, i) => (
          <CourseCard course={course} key={i} />
        ))}
      </div>

      <div className="flex justify-center">
        <Link
          to="/course-list"
          className="px-10 py-3 rounded-md text-white bg-blue-600/70 hover:bg-blue-600/90"
        >
          Show all courses
        </Link>
      </div>
    </div>
  );
}

export default CoursesSection;
