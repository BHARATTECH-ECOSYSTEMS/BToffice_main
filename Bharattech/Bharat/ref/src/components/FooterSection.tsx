import { Twitter, Linkedin, Github, Mail } from "lucide-react";

const footerLinks = {
  Platforms: ["Collegecue", "Rivinity", "RECAG"],
  Company: ["About Us", "Careers", "Contact", "Blog"],
  Resources: ["Documentation", "Research Papers", "Community", "Support"],
};

const FooterSection = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          <div className="lg:col-span-2">
            <h3 className="font-display text-xl font-bold mb-3">bharattech</h3>
            <p className="text-primary-foreground/50 text-sm leading-relaxed max-w-xs mb-6">
              Building India's foundational AI infrastructure.
              Sovereign technology, accessible to all.
            </p>
            <div className="flex gap-3">
              {[Twitter, Linkedin, Github, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-full border border-primary-foreground/15 flex items-center justify-center text-primary-foreground/40 hover:text-primary-foreground/80 hover:border-primary-foreground/30 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs uppercase tracking-[0.15em] font-semibold mb-5 text-primary-foreground/80">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-primary-foreground/40 hover:text-primary-foreground/80 transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-primary-foreground/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-primary-foreground/30">
            © {new Date().getFullYear()} Bharattech. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service", "Cookie Settings"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-xs text-primary-foreground/30 hover:text-primary-foreground/60 transition-colors"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
