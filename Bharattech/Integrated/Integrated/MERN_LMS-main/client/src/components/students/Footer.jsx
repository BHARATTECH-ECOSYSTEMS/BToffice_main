import { assets } from "../../assets/assets";

const COMPANY_LINKS = [
  { label: "Home", href: "#" },
  { label: "About us", href: "#" },
  { label: "Contact us", href: "#" },
  { label: "Privacy policy", href: "#" },
];

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-5 w-full bg-white text-left">
      <div className="grid grid-cols-1 gap-10 border-b border-gray-200 px-6 py-10 sm:grid-cols-2 sm:px-10 md:gap-14 lg:grid-cols-3 lg:gap-16 lg:px-20 xl:px-36">
        {/* Brand */}
        <div className="flex flex-col items-center sm:items-start">
          <img src={assets.logo} alt="Company logo" className="h-20 w-auto" />
          <p className="mt-6 text-center text-sm text-gray-600 sm:text-left">
            Empowering learners to achieve their full potential with quality
            online courses.
          </p>
        </div>

        {/* Company links */}
        <div className="flex flex-col items-center sm:items-start">
          <h2 className="mb-5 font-semibold text-gray-800">Company</h2>
          <ul className="flex flex-col items-center gap-2 text-sm text-gray-600 sm:items-start">
            {COMPANY_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="transition-colors duration-200 hover:text-blue-600"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter — now visible on every screen size */}
        <div className="flex flex-col items-center text-center sm:col-span-2 sm:items-start sm:text-left lg:col-span-1">
          <h2 className="mb-5 font-semibold text-gray-800">
            Subscribe to our newsletter
          </h2>
          <p className="text-sm text-gray-600">
            The latest news, articles, and resources, sent to your inbox weekly.
          </p>
          <div className="mt-4 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
            <input
              type="email"
              placeholder="Enter your email"
              aria-label="Email address"
              className="h-9 w-full min-w-0 rounded border border-gray-300 bg-gray-50 px-2 text-sm text-gray-700 outline-none placeholder-gray-400 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:flex-1"
            />
            <button className="h-9 shrink-0 rounded bg-blue-600 px-4 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700 sm:w-24 sm:px-0">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      <p className="py-4 text-center text-xs text-gray-500 md:text-sm">
        Copyright {currentYear} &copy; Amzilox. All Right Reserved.
      </p>
    </footer>
  );
}

export default Footer;
