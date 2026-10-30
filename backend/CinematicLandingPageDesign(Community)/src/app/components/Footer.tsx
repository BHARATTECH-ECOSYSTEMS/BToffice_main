import { Link } from 'react-router';

const footerLinks: Record<string, { label: string; href: string }[]> = {
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Blog", href: "/blog" },
    { label: "Story", href: "/about" },
  ],
  Products: [
    { label: "Collegecue", href: "#" },
    { label: "Rivinity", href: "/research" },
    { label: "RECAG", href: "#" },
    { label: "More", href: "/research" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "Careers", href: "/careers" },
    { label: "Research", href: "/research" },
    { label: "Platforms", href: "#" },
    { label: "Employees", href: "#" },
  ],
};

export const Footer = () => {
  return (
    <footer className="pt-14 sm:pt-20 pb-0 bg-background overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-10 sm:gap-12 mb-10 sm:mb-16">
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <svg width="32" height="18" viewBox="0 0 42 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-foreground">
                <path d="M22.35 0.97C22.91 0.39 23.66 0.07 24.45 0.07C27.98 0.07 31.31 0.07 34.59 0.07C41.18 0.07 44.48 8.36 39.82 13.21L29.66 23.77C29.2 24.26 28.4 23.91 28.4 23.23V13.92L29.58 12.7C30.51 11.73 29.85 10.07 28.53 10.07H13.6L22.35 0.97Z" />
                <path d="M19.65 23.03C19.09 23.61 18.34 23.93 17.55 23.93C14.02 23.93 10.69 23.93 7.41 23.93C0.82 23.93 -2.48 15.64 2.18 10.79L12.34 0.23C12.8 -0.26 13.6 0.09 13.6 0.77V10.08L12.43 11.3C11.49 12.27 12.15 13.92 13.47 13.92H28.4L19.65 23.03Z" />
              </svg>
              <h3 className="font-display text-2xl font-bold text-foreground tracking-tight">Bharattech</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mb-8">
              AI infrastructure designed to power India's digital future, so you can focus on what truly matters.
            </p>
            <div className="flex items-center gap-3 sm:gap-4">
              {/* ISO 9001:2015 */}
              <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#B497FF]/50 bg-card shrink-0" title="ISO 9001:2015">
                <div className="text-center leading-none">
                  <div className="text-[10px] font-extrabold text-[#6A35FF] tracking-tight">ISO</div>
                  <div className="text-[11px] font-extrabold text-foreground tracking-tight mt-0.5">9001</div>
                  <div className="text-[7px] text-muted-foreground tracking-wide mt-1">2015</div>
                </div>
              </div>
              {/* GDPR */}
              <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#003399] shrink-0" title="GDPR Compliant">
                <div className="text-center leading-none">
                  <div className="flex justify-center mb-1">
                    {[...Array(6)].map((_, i) => (
                      <svg key={i} className="h-2 w-2 -mx-px fill-[#FFCC00]" viewBox="0 0 10 10"><path d="M5 0l1.2 3.5H10L7 5.7l1.2 3.5L5 7l-3.2 2.2L3 5.7 0 3.5h3.8z"/></svg>
                    ))}
                  </div>
                  <div className="text-[11px] font-extrabold text-white tracking-tight">GDPR</div>
                </div>
              </div>
              {/* SOC 2 */}
              <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-foreground shrink-0" title="SOC 2 Type II">
                <div className="text-center leading-none">
                  <div className="text-[7px] font-bold text-background/60 tracking-[0.1em]">AICPA</div>
                  <div className="text-[12px] font-extrabold text-background tracking-tight mt-0.5">SOC</div>
                  <div className="text-[9px] font-bold text-accent tracking-tight">2</div>
                </div>
              </div>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-foreground mb-5">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("/") ? (
                      <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
                    ) : (
                      <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="relative h-28 sm:h-40 lg:h-48 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 opacity-[0.08] text-foreground">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dotPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="currentColor" />
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
        <h2 className="relative z-10 font-display text-[13vw] sm:text-[6rem] lg:text-[8rem] font-bold text-foreground/[0.06] tracking-tight sm:tracking-[0.15em] uppercase select-none leading-none whitespace-nowrap">
          BHARATTECH
        </h2>
      </div>
    </footer>
  );
};
