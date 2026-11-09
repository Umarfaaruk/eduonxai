import type { ComponentProps } from "react";

type Variant = "primary" | "ghost";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 ease-out cursor-pointer select-none";

const variants: Record<Variant, string> = {
  // Cyan CTA with dark text keeps contrast above 10:1
  primary:
    "bg-accent text-ink shadow-[0_8px_30px_-8px_rgb(34_211_238_/_0.55)] hover:bg-[#5ce1f4] hover:-translate-y-0.5 active:translate-y-0",
  ghost: "border border-line bg-white/[0.03] text-fg hover:bg-white/[0.08] hover:border-white/20",
};

const sizes: Record<Size, string> = {
  md: "h-12 px-6 text-base",
  sm: "h-10 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"a"> & { variant?: Variant; size?: Size }) {
  return <a className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}
