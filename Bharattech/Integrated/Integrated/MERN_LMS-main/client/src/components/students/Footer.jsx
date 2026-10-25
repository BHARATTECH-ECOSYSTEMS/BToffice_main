import { Link } from "react-router-dom";
import { assets } from "../../assets/assets";

// Only places that exist (owner's 2A, 2026-10-26): the company's footer had links to "#", a newsletter box that sent
// nothing, and another company's name.
const LEARNING_LINKS = [
  { label: "Home", to: "/" },
  { label: "All courses", to: "/course-list" },
  { label: "My Enrollments", to: "/my-enrollments" },
];
const PORTAL_URL = import.meta.env.VITE_PORTAL_URL;

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-5 w-full bg-white text-left">
      <div className="grid grid-cols-1 gap-10 border-b border-gray-200 px-6 py-10 sm:grid-cols-2 sm:px-10 md:gap-14 lg:px-20 xl:px-36">
        {/* Brand */}
        <div className="flex flex-col items-center sm:items-start">
          <img src={assets.logo} alt="Bharattech logo" className="h-20 w-auto" />
          <p className="mt-6 text-center text-sm text-gray-600 sm:text-left">
            Courses for the Bharattech team, free for everyone in it.
          </p>
        </div>

        {/* Learning links */}
        <div className="flex flex-col items-center sm:items-start">
          <h2 className="mb-5 font-semibold text-gray-800">Learning</h2>
          <ul className="flex flex-col items-center gap-2 text-sm text-gray-600 sm:items-start">
            {LEARNING_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="transition-colors duration-200 hover:text-blue-600">
                  {link.label}
                </Link>
              </li>
            ))}
            {PORTAL_URL && (
              <li>
                <a href={PORTAL_URL} className="transition-colors duration-200 hover:text-blue-600">
                  Back to the portal
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <p className="py-4 text-center text-xs text-gray-500 md:text-sm">
        &copy; {currentYear} Bharattech. All rights reserved.
      </p>
    </footer>
  );
}

export default Footer;
