import { ArrowRight, Check } from "lucide-react";
import { site } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { HeroVisual } from "@/components/HeroVisual";

const trust = ["Personalized plans", "Exam-style mocks", "AI tutor on demand"];

export function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden pt-28 pb-20 sm:pt-36 lg:pb-28">
      <div className="bg-dots absolute inset-0 -z-10" aria-hidden />
      <div className="absolute left-1/2 top-0 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand/25 blur-[120px]" aria-hidden />
      <div className="absolute right-0 top-40 -z-10 h-72 w-72 rounded-full bg-accent/10 blur-[110px]" aria-hidden />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.04] px-3.5 py-1.5 text-sm text-muted">
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px] shadow-accent" />
            AI-powered learning platform
          </p>
          <h1 className="mt-6 text-balance text-4xl font-extrabold sm:text-5xl lg:text-6xl">
            Prepare smarter for exams <span className="text-gradient">and careers</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg text-muted">
            Eduonxai builds a personalized study plan, teaches you with an AI tutor, and tests you with timed mock exams, so you always know what to study next.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button href={site.appUrl}>
              Start learning <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button href="#how" variant="ghost">
              See how it works
            </Button>
          </div>
          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {trust.map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <Check className="size-4 text-accent" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal>
          <HeroVisual />
        </Reveal>
      </div>
    </section>
  );
}
