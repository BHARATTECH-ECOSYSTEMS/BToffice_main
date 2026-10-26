import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import logo from "../../assets/BHARATTECH ORIGIN Logo-01.png";
import { primaryButton, quietButton } from "../students/ui";

// The educator pages' top bar (owner's 2A, 2026-10-26): the same bar as the learner side, with the educator's
// three pages as tabs and "Add a course" as the one action, instead of a sidebar.
const TABS = [
  { label: "Dashboard", to: "/educator/dashboard", match: (p) => p === "/educator" || p.startsWith("/educator/dashboard") },
  { label: "My courses", to: "/educator/my-courses", match: (p) => p.startsWith("/educator/my-courses") },
  { label: "Learners", to: "/educator/students-enrolled", match: (p) => p.startsWith("/educator/students-enrolled") },
];

const tab = (active) =>
  `relative px-1 py-5 text-sm font-medium transition-colors duration-150 ease-snappy ${
    active ? "text-ink after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-act" : "text-muted mhover:text-ink"
  }`;

function EducatorNavbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { switchViewRole, isAdmin, signOut } = useAuth();
  const adding = pathname.startsWith("/educator/add-course");

  const handleStudentView = () => {
    switchViewRole("student");
    toast.success("You're now seeing Learning as a learner.");
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-8">
          <Link to="/educator/dashboard" aria-label="Educator dashboard" className="flex shrink-0 items-center py-2">
            <img src={logo} alt="Bharattech" className="h-14 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-5">
            {TABS.map((item) => {
              const active = item.match(pathname);
              return (
                <Link key={item.to} to={item.to} className={tab(active)} aria-current={active ? "page" : undefined}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!adding && (
            <Link to="/educator/add-course" className={`px-4 py-1.5 text-sm ${primaryButton}`}>
              Add a course
            </Link>
          )}
          {isAdmin() && (
            <button type="button" onClick={handleStudentView} className={`px-4 py-1.5 text-sm ${quietButton}`}>
              View as learner
            </button>
          )}
          <button type="button" onClick={signOut} className={`px-4 py-1.5 text-sm ${quietButton}`}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}

export default EducatorNavbar;
