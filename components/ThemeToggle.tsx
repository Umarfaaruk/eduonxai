"use client";

import { Moon, Sun } from "lucide-react";

/**
 * Stateless toggle: the current theme lives on <html data-theme>, so there is
 * no hydration mismatch. Icons are shown/hidden by CSS tokens.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage can be unavailable (private mode); the choice just won't persist */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      className="grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-wash text-fg transition-colors duration-200 hover:bg-wash-2"
    >
      <Sun className="icon-sun size-5" aria-hidden />
      <Moon className="icon-moon size-5" aria-hidden />
    </button>
  );
}
