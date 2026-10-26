import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import EducatorNavbar from "../educator/Navbar";
import logo from "../../assets/BHARATTECH ORIGIN Logo-01.png";
import { quietButton } from "./ui";

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL;

const tab = ({ isActive }) =>
  `relative px-1 py-5 text-sm font-medium transition-colors duration-150 ease-snappy ${
    isActive ? "text-ink after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-act" : "text-muted mhover:text-ink"
  }`;
const quiet = `${quietButton} px-4 py-1.5 text-sm`;

function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { viewRole, switchViewRole, isAdmin, signOut } = useAuth();
  // the course list and a course's page belong to Courses; a course you're taking (the player) to My courses
  const onMine = pathname.startsWith("/my-enrollments") || pathname.startsWith("/player");
  const onCourses = !onMine && (pathname === "/" || pathname.startsWith("/course"));

  if (viewRole === "educator") {
    return <EducatorNavbar />;
  }

  const handleEducatorView = () => {
    switchViewRole("educator");
    toast.success("You're now seeing Learning as an educator.");
    navigate("/educator/dashboard");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-8">
          <Link to="/" aria-label="Learning home" className="flex shrink-0 items-center py-2">
            <img src={logo} alt="Bharattech" className="h-14 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-5">
            <Link to="/" className={tab({ isActive: onCourses })} aria-current={onCourses ? "page" : undefined}>
              Courses
            </Link>
            <Link to="/my-enrollments" className={tab({ isActive: onMine })} aria-current={onMine ? "page" : undefined}>
              My courses
            </Link>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {PORTAL_URL && (
            <a href={PORTAL_URL} className="px-3 py-1.5 text-sm font-medium text-muted transition-colors duration-150 ease-snappy mhover:text-ink">
              Back to the portal
            </a>
          )}
          {isAdmin() && (
            <button type="button" onClick={handleEducatorView} className={quiet}>
              View as educator
            </button>
          )}
          <button type="button" onClick={signOut} className={quiet}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
