import { Reveal } from "@/components/ui/Reveal";

export function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-accent-ink">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-extrabold sm:text-4xl lg:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-pretty text-lg text-muted">{sub}</p>}
    </Reveal>
  );
}
