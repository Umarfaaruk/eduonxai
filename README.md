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

## Security

- `npm audit` reports 0 vulnerabilities (a `minimatch` override covers a dev-only lint dependency)
- Security headers are set in `next.config.ts`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP
- The CSP allows `'unsafe-inline'` scripts because statically prerendered Next.js pages need inline bootstrap scripts. Move to nonce-based CSP if you later render pages dynamically.
- No secrets, forms or third-party scripts in this codebase

## Brand

- Logo concepts and final files: `assets/final/` (final), `assets/v5/` (explored concepts)
- Web logo files: `public/logo-dark.svg`, `public/mark.svg`
- Palette: ink `#0B1026`, brand indigo `#4F46E5`, accent cyan `#22D3EE`
