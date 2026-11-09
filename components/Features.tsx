import { Check } from "lucide-react";
import { features, type FeatureId } from "@/lib/content";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHead } from "@/components/SectionHead";

/** Small decorative visuals for the larger bento cards (illustrative only). */
function Visual({ id }: { id: FeatureId }) {
  if (id === "plan") {
    const days = ["M", "T", "W", "T", "F", "S", "S"];
    return (
      <div className="mt-6 flex gap-2" aria-hidden>
        {days.map((d, i) => (
          <div key={i} className={`grid h-14 flex-1 place-items-center rounded-xl border text-sm font-semibold ${i < 4 ? "border-accent/30 bg-accent/10 text-accent" : "border-line bg-white/[0.03] text-muted"}`}>
            {i < 4 ? <Check className="size-4" /> : d}
          </div>
        ))}
      </div>
    );
  }
  if (id === "tutor") {
    return (
      <div className="mt-6 space-y-2 text-sm" aria-hidden>
        <div className="ml-auto w-fit rounded-2xl rounded-br-md bg-brand px-3.5 py-2">Explain this step by step</div>
        <div className="w-fit rounded-2xl rounded-bl-md bg-white/[0.06] px-3.5 py-2 text-muted">Sure. First, identify what the question asks for&hellip;</div>
      </div>
    );
  }
  if (id === "progress") {
    const bars = [38, 52, 46, 64, 58, 76, 88];
    return (
      <div className="mt-6 flex h-20 items-end gap-2" aria-hidden>
        {bars.map((h, i) => (
          <div key={i} style={{ height: `${h}%` }} className="flex-1 rounded-t-md bg-gradient-to-t from-brand to-accent opacity-90" />
        ))}
      </div>
    );
  }
  return null;
}

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead
          eyebrow="Everything in one place"
          title="One platform for the whole preparation loop"
          sub="Plan, learn, practice, test and track, without juggling five different apps."
        />
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {features.map(({ id, icon: Icon, title, text, wide }) => (
            <Reveal key={id} as="article" className={`group relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-surface-2/70 ${wide ? "md:col-span-2" : ""}`}>
              <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand/0 blur-3xl transition-colors duration-500 group-hover:bg-brand/30" aria-hidden />
              <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-deep text-white shadow-lg shadow-brand/30">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-xl font-bold">{title}</h3>
              <p className="mt-2 max-w-prose text-pretty text-muted">{text}</p>
              <Visual id={id} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
