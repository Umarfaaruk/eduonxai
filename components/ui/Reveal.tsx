import type { ReactNode } from "react";

/**
 * Scroll-reveal using CSS scroll-driven animations (see `.reveal` in globals.css).
 * Server component, no JavaScript. Browsers without support, and users who prefer
 * reduced motion, simply see the content with no animation.
 */
export function Reveal({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  return <Tag className={`reveal ${className}`}>{children}</Tag>;
}
