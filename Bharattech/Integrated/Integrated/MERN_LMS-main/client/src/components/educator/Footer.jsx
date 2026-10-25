import { assets } from "../../assets/assets";

// The company's footer named another company and linked its social icons to "#" (owner's 2A, 2026-10-26).
function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="flex items-center justify-center md:justify-start text-left w-full px-8 border-t">
      <div className="flex items-center gap-4">
        <img src={assets.logo} alt="Bharattech logo" className="hidden md:block w-20" />
        <div className="hidden md:block h-7 w-px bg-gray-500/60"></div>
        <p className="py-4 text-center text-xs md:text-sm text-gray-500">
          &copy; {currentYear} Bharattech. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
