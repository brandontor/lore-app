import Link from "next/link";
import { Video, Download, Filter, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAllUserVideos } from "@/lib/queries/videos";
import { getUserCampaigns } from "@/lib/queries/campaigns";
import type { VideoStatus } from "@lore/shared";

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isSafeStorageUrl(path: string): boolean {
  if (path.startsWith("/")) return true;
  try {
    const url = new URL(path);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatStyle(style: string): string {
  return style
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function statusBadgeVariant(status: VideoStatus): "warning" | "danger" {
  return status === "error" ? "danger" : "warning";
}

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ notice }, videos, campaigns] = await Promise.all([
    searchParams,
    getAllUserVideos(),
    getUserCampaigns(),
  ]);

  const campaignMap: Record<string, string> = {};
  for (const c of campaigns) {
    campaignMap[c.id] = c.name;
  }

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

      {notice === 'already-generated' && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>All selected scenes already have videos for that style — your existing videos are shown below.</span>
        </div>
      )}

      {videos.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No videos yet"
          description="Generate your first video from a campaign's transcripts."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => {
            const campaignName = campaignMap[video.campaign_id] ?? video.campaign_id;
            const date = new Date(video.created_at).toLocaleDateString();
            const duration = formatDuration(video.duration_seconds);
            const isCompleted = video.status === "completed";
            const hasFile = video.storage_path !== null && isSafeStorageUrl(video.storage_path);
            // Validate image_url before rendering — it comes from the DB and must be https
            const hasKeyframe = video.image_url !== null && isSafeStorageUrl(video.image_url);

            return (
              <Card key={video.id} className="group overflow-hidden">
                <CardContent className="p-0">
                  {/* Thumbnail */}
                  <Link href={`/videos/${video.id}`}>
                    <div className="relative flex h-44 items-center justify-center overflow-hidden bg-zinc-100 transition-colors group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700">
                      {hasKeyframe ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={video.image_url!}
                          alt={video.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Video className="h-10 w-10 text-zinc-400" />
                      )}
                      {isCompleted && duration && (
                        <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                          {duration}
                        </span>
                      )}
                      {!isCompleted && (
                        <span className="absolute bottom-2 right-2">
                          <Badge variant={statusBadgeVariant(video.status)}>
                            {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                          </Badge>
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="p-4">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <Link href={`/videos/${video.id}`} className="font-medium text-zinc-900 hover:text-violet-600 dark:text-zinc-100 dark:hover:text-violet-400">
                        {video.title}
                      </Link>
                    </div>
                    <p className="mb-3 text-xs text-zinc-500">{campaignName} · {date}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{formatStyle(video.style)}</Badge>
                      {hasFile ? (
                        <a
                          href={video.storage_path!}
                          download
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      ) : (
                        <button
                          disabled
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-zinc-300 dark:text-zinc-600 disabled:pointer-events-none"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
