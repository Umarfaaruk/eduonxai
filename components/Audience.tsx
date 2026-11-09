import { Check } from "lucide-react";
import { audiences } from "@/lib/content";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHead } from "@/components/SectionHead";

export function Audience() {
  return (
    <section id="for-you" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="Who it's for" title="Built for people with a goal and a deadline" />
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {audiences.map(({ icon: Icon, title, text, points }) => (
            <Reveal key={title} as="article" className="rounded-[var(--radius-card)] border border-line bg-gradient-to-b from-surface-2/80 to-surface/60 p-7 sm:p-8">
              <span className="grid size-12 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/25">
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-5 text-2xl font-bold">{title}</h3>
              <p className="mt-3 text-pretty text-muted">{text}</p>
              <ul className="mt-6 space-y-3">
                {points.map((p) => (
                  <li key={p} className="flex items-center gap-3">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent/15 text-accent"><Check className="size-3" aria-hidden /></span>
                    {p}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
