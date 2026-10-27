import { Link } from "react-router-dom";

// Only places that exist (owner's 2A, 2026-10-26): the company's footer had links to "#", a newsletter box that sent
// nothing, and another company's name.
const LEARNING_LINKS = [
  { label: "Courses", to: "/" },
  { label: "My courses", to: "/my-enrollments" },
];
const PORTAL_URL = import.meta.env.VITE_PORTAL_URL;

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-line text-left">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted">
        <p>
          &copy; {currentYear} Bharattech. Courses for the team, free for everyone in it.
        </p>
        <ul className="flex flex-wrap items-center gap-5">
          {LEARNING_LINKS.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="tap transition-colors duration-150 ease-snappy mhover:text-ink">
                {link.label}
              </Link>
            </li>
          ))}
          {PORTAL_URL && (
            <li>
              <a href={PORTAL_URL} className="tap transition-colors duration-150 ease-snappy mhover:text-ink">
                Back to the portal
              </a>
            </li>
          )}
        </ul>
      </div>
    </footer>
  );
}

export default Footer;
