# EduOnx — AI-Powered Learning Platform

An intelligent learning platform with AI tutoring, study tracking, gamification, and personalized learning paths.

## Tech Stack

- **Framework**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Firebase (Auth, Firestore)
- **AI**: Groq API (Llama 3.3 70B) via server proxy
- **Charts**: Recharts
- **Animation**: Framer Motion + GSAP
- **Deployment**: Vercel

## Features

- **AI Tutor** — Chat with an AI tutor about your study materials
- **Lessons** — Curated learning paths with progress tracking & XP
- **YouTube Workspace** — Embed videos inside lessons with side-by-side tools
- **Quick Tools** — Notes, Calculator, AI Summarizer (context-aware in lessons)
- **Study Planner** — AI-generated study roadmaps (toggle in Lessons)
- **Practice Arena** — Quiz engine with topic-based assessments
- **NDLI Library** — Search the National Digital Library of India for eBooks
- **Progress Dashboard** — Daily/weekly/monthly analytics
- **Gamification** — XP, streaks, achievements, leaderboards
- **Deep Focus Mode** — Minimal UI for distraction-free studying
- **Ask Doubt** — AI-powered doubt solving with image support

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase and Groq API keys

# Start development server
npm run dev
```

## Project Structure

```
src/
├── components/       # Shared components (layout, UI, landing)
├── contexts/         # React contexts (Auth)
├── hooks/            # Custom hooks (dashboard data, deep focus)
├── lib/              # Services (AI, Firebase, analytics, utils)
├── pages/            # Route pages
│   ├── auth/         # Login, Signup
│   ├── doubts/       # Ask Doubt, AI Solution, Camera Q&A
│   ├── lessons/      # Lesson List, Lesson Viewer (with YouTube + Tools)
│   ├── materials/    # Resource Library, AI Tutor, Flashcards, Study Planner
│   ├── progress/     # Progress Dashboard
│   ├── quiz/         # Practice Arena
│   ├── social/       # Leaderboard, Friends, Achievements
│   ├── timer/        # Study Timer
│   └── tools/        # Quick Tools (standalone fallback)
└── api/              # Vercel serverless functions (Groq proxy, NDLI proxy)
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `GROQ_API_KEY` | Groq API key (server-side only) |

## License

© 2026 EduOnx. All rights reserved.
