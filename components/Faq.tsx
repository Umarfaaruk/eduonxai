import { Plus } from "lucide-react";
import { faqs } from "@/lib/content";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHead } from "@/components/SectionHead";

export function Faq() {
  return (
    <section id="faq" className="border-t border-line bg-surface/40 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHead eyebrow="FAQ" title="Questions, answered" />
        <Reveal className="mt-12 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-ink/60">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex min-h-14 list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                {f.q}
                <Plus className="size-5 shrink-0 text-accent transition-transform duration-200 group-open:rotate-45" aria-hidden />
              </summary>
              <p className="px-5 pb-5 text-pretty text-muted">{f.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
