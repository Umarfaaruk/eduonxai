# Eduonxai

AI-powered learning platform for competitive exam preparation and career skills: personalized study plans, lessons, practice quizzes, timed mock exams, an AI tutor and progress tracking.

This repo holds the marketing website and the brand assets.

## Stack

- Next.js (App Router, Server Components by default) and TypeScript
- Tailwind CSS v4 with design tokens in `app/globals.css`
- Motion for the hero preview, Lucide for icons
- Self-hosted fonts via `next/font/local` (Manrope and Inter), no third-party requests
- CSS scroll-driven animations for section reveals (no JavaScript, respects reduced motion)
- Metadata API, generated Open Graph image, sitemap and robots

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
```

## Configuration

Copy these into `.env.local` when you deploy:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Where the "Start learning" buttons go (your sign-up or login page) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL, used for metadata, sitemap and robots |

## Theming

Light and dark themes are driven by CSS variables (`--c-*` in `app/globals.css`) keyed on `<html data-theme>`.
- First visit follows the OS setting (with a no-JS `prefers-color-scheme` fallback); the toggle saves the choice to `localStorage`.
- A tiny inline script in `app/layout.tsx` sets the theme before first paint, so there is no flash.
- The toggle is stateless (`components/ThemeToggle.tsx`), so there is no hydration mismatch.
- `components/Logo.tsx` swaps between `logo-dark.svg` and `logo-light.svg` via CSS.
- Any section can force a theme with `data-theme="dark"` (the CTA panel does), and set `text-fg` on it so text re-resolves in that scope.

## Security

- `npm audit` reports 0 vulnerabilities (a `minimatch` override covers a dev-only lint dependency)
- Security headers are set in `next.config.ts`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP
- The CSP allows `'unsafe-inline'` scripts because statically prerendered Next.js pages need inline bootstrap scripts. Move to nonce-based CSP if you later render pages dynamically.
- No secrets, forms or third-party scripts in this codebase

## Brand

- Logo concepts and final files: `assets/final/` (final), `assets/v5/` (explored concepts)
- Web logo files: `public/logo-dark.svg`, `public/mark.svg`
- Palette: ink `#0B1026`, brand indigo `#4F46E5`, accent cyan `#22D3EE`
