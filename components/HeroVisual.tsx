"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, Flame, MessageSquareText, Timer } from "lucide-react";

const C = 2 * Math.PI * 34; // ring circumference
const PROGRESS = 0.68;

/** Decorative product preview. Content is illustrative, not real user data. */
export function HeroVisual() {
  const reduce = useReducedMotion();
  const float = (dy: number, d: number) =>
    reduce ? {} : { animate: { y: [0, dy, 0] }, transition: { duration: d, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="absolute -inset-10 -z-10 rounded-full bg-brand/30 blur-3xl" />

      <motion.div {...float(-6, 7)} className="rounded-3xl border border-line bg-surface/80 p-5 shadow-glow backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Today&apos;s plan</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-fg">
            <Flame className="size-3.5 text-accent" /> 7 day streak
          </span>
        </div>
        <div className="mt-5 flex items-center gap-5">
          <div className="relative size-24 shrink-0">
            <svg viewBox="0 0 80 80" className="size-full -rotate-90">
              <defs>
                <linearGradient id="ring" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0" stopColor="#4F46E5" />
                  <stop offset="1" stopColor="#22D3EE" />
                </linearGradient>
              </defs>
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="8" />
              <motion.circle
                cx="40" cy="40" r="34" fill="none" stroke="url(#ring)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={C}
                initial={{ strokeDashoffset: reduce ? C * (1 - PROGRESS) : C }}
                animate={{ strokeDashoffset: C * (1 - PROGRESS) }}
                transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center font-display text-xl font-extrabold">68%</span>
          </div>
          <ul className="flex-1 space-y-2.5 text-sm">
            {["Mechanics lesson", "20 question quiz"].map((t) => (
              <li key={t} className="flex items-center gap-2 text-muted">
                <span className="grid size-5 place-items-center rounded-full bg-accent/15 text-accent"><Check className="size-3" /></span>
                <span className="line-through decoration-white/20">{t}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 text-fg">
              <span className="size-5 rounded-full border border-white/25" />
              Timed mock section
            </li>
          </ul>
        </div>
      </motion.div>

      <motion.div {...float(7, 8)} className="relative -mt-3 ml-6 rounded-3xl border border-line bg-surface-2/90 p-4 shadow-glow backdrop-blur sm:ml-12">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-sm">
          Why does a rocket move forward in space?
        </div>
        <div className="mt-2.5 max-w-[90%] rounded-2xl rounded-bl-md bg-white/[0.06] px-3.5 py-2.5 text-sm text-fg">
          <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-accent">
            <MessageSquareText className="size-3.5" /> AI tutor
          </span>
          Newton&apos;s third law. The engine pushes gas backward, and the gas pushes the rocket forward with equal force.
        </div>
      </motion.div>

      <motion.div {...float(-5, 6.5)} className="relative -mt-2 mr-4 flex w-fit items-center gap-3 rounded-2xl border border-line bg-surface/90 px-4 py-3 shadow-glow backdrop-blur sm:ml-auto">
        <Timer className="size-5 text-accent" />
        <div className="text-sm leading-tight">
          <strong className="block font-semibold">Mock exam</strong>
          <span className="text-xs text-muted">Section 2 of 3</span>
        </div>
        <span className="ml-2 font-display text-lg font-bold tabular-nums">42:15</span>
      </motion.div>

      <p className="mt-4 text-center text-xs text-muted">Product preview, illustrative content</p>
    </div>
  );
}
