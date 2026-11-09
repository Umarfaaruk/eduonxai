import { steps } from "@/lib/content";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHead } from "@/components/SectionHead";

export function HowItWorks() {
  return (
    <section id="how" className="border-y border-line bg-surface/40 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="How it works" title="From goal to result in three steps" />
        <ol className="relative mt-14 grid gap-5 md:grid-cols-3">
          <div className="absolute left-[16.6%] right-[16.6%] top-7 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block" aria-hidden />
          {steps.map((s, i) => (
            <Reveal key={s.title} as="li" className="relative rounded-[var(--radius-card)] border border-line bg-ink/60 p-6 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-gradient-to-br from-brand to-accent font-display text-xl font-extrabold text-ink ring-8 ring-ink">
                {i + 1}
              </span>
              <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-pretty text-muted">{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
