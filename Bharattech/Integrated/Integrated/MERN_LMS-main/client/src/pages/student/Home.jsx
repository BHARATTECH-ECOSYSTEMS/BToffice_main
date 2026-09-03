import Hero from "../../components/students/Hero";
import CoursesSection from "../../components/students/CoursesSection";
import { useAuth } from "../../context/AuthContext";
import Educator from "../educator/Educator";



function Home() {
  const { user, viewRole, loading } = useAuth();

  if (loading) return null;

  // 🔍 Debug (1 baar dekh lo console me)
  console.log("HOME ROLE:", user?.role);
  console.log("HOME VIEW:", viewRole);

  // ✅ ADMIN / EDUCATOR
  if (viewRole === "educator") {
    return <Educator />;
  }

  // ✅ STUDENT / INTERN / EMPLOYEE
  return (
    <div className="flex flex-col items-center space-y-7 text-center">
      <Hero />
      <CoursesSection />
    </div>
  );
}

export default Home;
