import Link from "next/link";
import { Video, Download, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const videos = [
  {
    id: "1",
    title: "The Siege of Barovia — Session 12",
    campaign: "Curse of Strahd",
    date: "Feb 6, 2026",
    duration: "2:34",
    style: "Cinematic",
  },
  {
    id: "2",
    title: "The Amber Temple Revelation — Session 10",
    campaign: "Curse of Strahd",
    date: "Jan 24, 2026",
    duration: "1:58",
    style: "Dark Fantasy",
  },
  {
    id: "3",
    title: "The Vault Heist — Session 7",
    campaign: "Waterdeep: Dragon Heist",
    date: "Jan 15, 2026",
    duration: "3:12",
    style: "Cinematic",
  },
  {
    id: "4",
    title: "Market Day Madness — Session 5",
    campaign: "Waterdeep: Dragon Heist",
    date: "Jan 1, 2026",
    duration: "2:05",
    style: "Anime",
  },
  {
    id: "5",
    title: "Into the Jungle — Session 2",
    campaign: "Tomb of Annihilation",
    date: "Dec 22, 2025",
    duration: "1:47",
    style: "Painterly",
  },
];

export default function VideosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Videos</h1>
          <p className="mt-1 text-sm text-zinc-500">AI-generated videos from your campaign sessions.</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900">
          <Filter className="h-4 w-4" />
          Filter by Campaign
        </button>
      </div>

      {videos.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No videos yet"
          description="Generate your first video from a campaign's transcripts."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Card key={video.id} className="group overflow-hidden">
              <CardContent className="p-0">
                {/* Thumbnail placeholder */}
                <Link href={`/videos/${video.id}`}>
                  <div className="relative flex h-44 items-center justify-center bg-zinc-100 transition-colors group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700">
                    <Video className="h-10 w-10 text-zinc-400" />
                    <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                      {video.duration}
                    </span>
                  </div>
                </Link>

                {/* Info */}
                <div className="p-4">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <Link href={`/videos/${video.id}`} className="font-medium text-zinc-900 hover:text-violet-600 dark:text-zinc-100 dark:hover:text-violet-400">
                      {video.title}
                    </Link>
                  </div>
                  <p className="mb-3 text-xs text-zinc-500">{video.campaign} · {video.date}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{video.style}</Badge>
                    <button className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
