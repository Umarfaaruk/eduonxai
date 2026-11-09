import { Logo } from "@/components/Logo";
import { navLinks } from "@/lib/content";

export function Footer() {
  return (
    <footer className="border-t border-line py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-sm text-muted sm:px-6 md:flex-row md:justify-between">
        <Logo width={112} height={27} />
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="py-1 transition-colors duration-200 hover:text-fg">
              {l.label}
            </a>
          ))}
        </nav>
        <p>&copy; 2026 Eduonxai. All rights reserved.</p>
      </div>
    </footer>
  );
}
