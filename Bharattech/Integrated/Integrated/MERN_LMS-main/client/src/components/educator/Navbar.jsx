import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import logo from "../../assets/BHARATTECH ORIGIN Logo-01.png";

function EducatorNavbar() {
  const navigate = useNavigate();
  const { switchViewRole, isAdmin } = useAuth();

  const handleStudentView = () => {
    switchViewRole("student");
    toast.success("Switched to Student View");
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex min-h-[64px] w-full items-center justify-between gap-3 px-3 sm:px-5 md:px-6 lg:px-8">
        {/* Logo */}
        <Link
          to="/educator/dashboard"
          aria-label="BharatTech educator dashboard"
          className="flex min-w-0 shrink-0 items-center"
        >
          <img
            src={logo}
            alt="BharatTech Logo"
            className="
              h-14 w-auto
              object-contain
              transition-transform duration-200
              hover:scale-105
              sm:h-16
              md:h-[72px]
              lg:h-20
            "
          />
        </Link>

        {/* Actions */}
        <div className="flex shrink-0 items-center">
          {isAdmin() && (
            <button
              type="button"
              onClick={handleStudentView}
              className="
                inline-flex items-center justify-center
                whitespace-nowrap
                rounded-full
                border border-green-200
                bg-green-50
                px-3 py-1.5
                text-xs font-medium text-green-700
                shadow-sm
                transition-all duration-200
                hover:border-green-300
                hover:bg-green-100
                hover:text-green-800
                hover:shadow
                focus:outline-none
                focus:ring-2 focus:ring-green-500/30
                active:scale-95
                sm:px-4 sm:py-2
                sm:text-sm
              "
            >
              View as Student
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default EducatorNavbar;
