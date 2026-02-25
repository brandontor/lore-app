import Link from "next/link";
import { BookOpen, ScrollText, Wand2, Video } from "lucide-react";

const features = [
  {
    icon: ScrollText,
    title: "Session Transcripts",
    description:
      "Automatically imported from your Discord sessions. Every battle, dialogue, and plot twist captured.",
  },
  {
    icon: Wand2,
    title: "AI Storyboarding",
    description:
      "Our AI reads your transcripts and crafts cinematic scene breakdowns ready for video generation.",
  },
  {
    icon: Video,
    title: "Video Generation",
    description:
      "Transform storyboards into stunning videos — cinematic, anime, or your style of choice.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-zinc-800 px-8 py-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-violet-400" />
          <span className="text-lg font-bold">Lore</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-8 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
          <Wand2 className="h-3.5 w-3.5" />
          AI-powered D&D video generation
        </div>
        <h1 className="mb-6 max-w-3xl text-5xl font-bold leading-tight tracking-tight">
          Bring your D&D sessions{" "}
          <span className="text-violet-400">to life</span>
        </h1>
        <p className="mb-10 max-w-xl text-lg text-zinc-400">
          Your Discord session transcripts become epic cinematic videos. Relive
          every critical hit, dramatic reveal, and legendary moment from your
          campaign.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-violet-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-violet-500"
          >
            Get Started — it&apos;s free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-700 px-6 py-3 text-base font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-800 px-8 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold">
            From transcript to epic video
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500/10">
                  <Icon className="h-6 w-6 text-violet-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                <p className="text-sm text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-8 py-6 text-center text-sm text-zinc-500">
        &copy; {new Date().getFullYear()} Lore. Built for adventurers.
      </footer>
    </div>
  );
}
