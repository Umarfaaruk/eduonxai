import {
  CalendarCheck,
  BookOpen,
  ListChecks,
  Timer,
  MessageSquareText,
  TrendingUp,
  GraduationCap,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export const site = {
  name: "Eduonxai",
  tagline: "AI-powered learning for exams and careers",
  description:
    "Eduonxai is an AI-powered learning platform with personalized study plans, lessons, practice quizzes, timed mock exams, an AI tutor and progress tracking.",
  // Set NEXT_PUBLIC_APP_URL to your sign-up or login page. Falls back to the CTA section.
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "#start",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#for-you", label: "Who it's for" },
  { href: "#faq", label: "FAQ" },
];

export type FeatureId = "plan" | "lessons" | "quizzes" | "mocks" | "tutor" | "progress";

export const features: {
  id: FeatureId;
  icon: LucideIcon;
  title: string;
  text: string;
  wide?: boolean;
}[] = [
  { id: "plan", icon: CalendarCheck, wide: true, title: "Personalized study plans", text: "Tell us your goal and date. Your plan adapts as you learn and puts the most time on the topics you find hardest." },
  { id: "lessons", icon: BookOpen, title: "Clear lessons", text: "Short, structured lessons that explain the idea first, then show how it is asked in exams and interviews." },
  { id: "quizzes", icon: ListChecks, title: "Practice quizzes", text: "Quick quizzes after every topic find gaps early, with an explanation for every answer." },
  { id: "tutor", icon: MessageSquareText, wide: true, title: "AI tutor", text: "Ask a doubt any time and get a step by step explanation. Follow up until it makes sense." },
  { id: "mocks", icon: Timer, title: "Timed mock exams", text: "Practice under real exam pressure, then review exactly where marks were lost." },
  { id: "progress", icon: TrendingUp, wide: true, title: "Progress tracking", text: "See streaks, topic strength and score trends, so every week shows you what improved." },
];

export const steps = [
  { title: "Set your goal", text: "Choose your exam or the career skill you want, and pick your target date." },
  { title: "Follow your plan", text: "Work through daily lessons and quizzes, and ask the AI tutor whenever you are stuck." },
  { title: "Test and improve", text: "Take timed mocks, review your mistakes, and watch your progress climb." },
];

export const audiences: {
  icon: LucideIcon;
  title: string;
  text: string;
  points: string[];
}[] = [
  {
    icon: GraduationCap,
    title: "Exam aspirants",
    text: "Preparing for competitive exams? Get a plan built around your syllabus and date, plus mock exams that feel like the real paper.",
    points: ["Syllabus-based study plans", "Timed mock exams with review", "Daily streaks to stay consistent"],
  },
  {
    icon: Briefcase,
    title: "Job seekers and professionals",
    text: "Building career skills? Learn step by step, practice with quizzes, and get answers from an AI tutor when you need them.",
    points: ["Skill-focused lessons", "Practice that fits your schedule", "Clear progress you can see"],
  },
];

export const faqs = [
  { q: "What is Eduonxai?", a: "Eduonxai is an AI-powered learning platform that combines personalized study plans, lessons, practice quizzes, timed mock exams, an AI tutor and progress tracking." },
  { q: "Is it only for exam preparation?", a: "No. It is built for competitive exam preparation and also for job seekers and professionals who want to build career skills." },
  { q: "How does the study plan work?", a: "You set a goal and a date. The plan schedules lessons, quizzes and mock exams, and adjusts as it learns which topics you find hardest." },
  { q: "Can the AI tutor make mistakes?", a: "Like any AI, it can. Use it to understand ideas faster, and check important facts against your lessons and official study material." },
];
