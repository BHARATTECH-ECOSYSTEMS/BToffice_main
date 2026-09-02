import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo-footer.png";
import { scrollReveal } from "@/lib/animations";

const footerLinks: Record<string, { label: string; href: string }[]> = {
  Company: [
    { label: "About", href: "/about#about" },
    { label: "Contact", href: "/about#contact" },
    { label: "Blog", href: "/research#blog" },
    { label: "Story", href: "/about#story" },
  ],
  Products: [
    { label: "Collegecue", href: "/platforms#collegecue" },
    { label: "Rivinity", href: "/platforms#rivinity" },
    { label: "RECAG", href: "/platforms#recag" },
    { label: "More", href: "/platforms#platforms" },
  ],
  Resources: [
    { label: "Documentation", href: "/research#documentation" },
    { label: "Careers", href: "/careers#careers" },
    { label: "Research", href: "/research#research" },
    { label: "Platforms", href: "/platforms#platforms" },
    { label: "Employees", href: "/employees#employees" },
  ],
};

const Footer = () => {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gridRef.current) scrollReveal(gridRef.current, { distance: 24, duration: 700 });
  }, []);

  return (
    <footer className="pt-20 pb-0 bg-brand-bg overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        <div ref={gridRef} style={{ opacity: 0 }} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          <div className="lg:col-span-2">
            <div className="flex items-center mb-5">
              <div className="bg-white rounded-lg px-2.5 py-1.5 inline-flex items-center">
                <img src={logo} alt="Bharattech Origin" className="h-7 w-auto" />
              </div>
            </div>
            <p className="text-sm text-brand-muted leading-relaxed max-w-sm mb-8">
              AI infrastructure designed to power India's digital future, so you can focus on what truly matters.
            </p>
            <div className="flex items-center gap-4">
              {/* ISO 9001:2015 */}
              <div className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-brand-primary/30 bg-white/[0.04]" title="ISO 9001:2015">
                <div className="text-center leading-none">
                  <div className="text-[8px] font-extrabold text-brand-secondary tracking-tight">ISO</div>
                  <div className="text-[7px] font-bold text-white tracking-tight mt-0.5">9001</div>
                  <div className="text-[5px] text-brand-muted tracking-tight mt-0.5">:2015</div>
                </div>
              </div>
              {/* GDPR */}
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#003399]" title="GDPR Compliant">
                <div className="text-center leading-none">
                  <div className="flex justify-center mb-0.5">
                    {[...Array(6)].map((_, i) => (
                      <svg key={i} className="h-1.5 w-1.5 -mx-px fill-[#FFCC00]" viewBox="0 0 10 10"><path d="M5 0l1.2 3.5H10L7 5.7l1.2 3.5L5 7l-3.2 2.2L3 5.7 0 3.5h3.8z"/></svg>
                    ))}
                  </div>
                  <div className="text-[9px] font-extrabold text-white tracking-tight">GDPR</div>
                </div>
              </div>
              {/* SOC 2 */}
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-foreground" title="SOC 2 Type II">
                <div className="text-center leading-none">
                  <div className="text-[6px] font-bold text-background/60 tracking-[0.1em]">AICPA</div>
                  <div className="text-[10px] font-extrabold text-background tracking-tight mt-0.5">SOC</div>
                  <div className="text-[8px] font-bold text-accent tracking-tight">2</div>
                </div>
              </div>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white mb-5">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("/") ? (
                      <Link to={link.href} className="text-sm text-brand-muted hover:text-white transition-colors">{link.label}</Link>
                    ) : (
                      <a href={link.href} className="text-sm text-brand-muted hover:text-white transition-colors">{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div
        className="relative h-64 overflow-hidden flex items-end justify-center pb-10"
        style={{ background: "linear-gradient(180deg, #040406 0%, #040406 4%, #FFFFFF 16%, #FFFFFF 100%)" }}
      >
        <div className="absolute inset-0 opacity-[0.1]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dotPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="#040406" />
              </pattern>
              <mask id="fadeMask">
                <rect width="100%" height="100%" fill="white" />
                <rect width="100%" height="40%" y="0" fill="url(#fadeTop)" />
              </mask>
              <linearGradient id="fadeTop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="black" />
                <stop offset="1" stopColor="white" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotPattern)" mask="url(#fadeMask)" />
          </svg>
        </div>
        <h2 className="relative z-10 font-display text-[4rem] sm:text-[6rem] lg:text-[8rem] font-bold text-brand-primary/20 tracking-[0.15em] uppercase select-none leading-none">
          BHARATTECH
        </h2>
      </div>
    </footer>
  );
};

export default Footer;
