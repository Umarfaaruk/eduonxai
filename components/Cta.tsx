import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { site } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function Cta() {
  return (
    <section id="start" className="px-4 py-20 sm:px-6 sm:py-28">
      <Reveal theme="dark" className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-gradient-to-br from-brand-deep via-surface-2 to-surface px-6 py-16 text-center text-fg sm:px-12">
        <div className="bg-dots absolute inset-0 -z-10 opacity-70" aria-hidden />
        <div className="glow absolute -top-24 left-1/2 -z-10 size-80 -translate-x-1/2 rounded-full bg-accent/20 blur-[100px]" aria-hidden />
        <Image src="/mark.svg" alt="" width={64} height={64} className="mx-auto" />
        <h2 className="mx-auto mt-6 max-w-2xl text-balance text-3xl font-extrabold sm:text-5xl">Start preparing the smarter way</h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-muted">Set your goal, get your plan, and let the AI tutor handle the doubts.</p>
        <Button href={site.appUrl} className="mt-8">
          Start learning <ArrowRight className="size-4" aria-hidden />
        </Button>
      </Reveal>
    </section>
  );
}
