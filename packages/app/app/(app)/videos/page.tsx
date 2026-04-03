import Link from "next/link";
import { Video, Download, Info, ScrollText, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAllUserVideosWithSession } from "@/lib/queries/videos";
import type { VideoWithSession } from "@/lib/queries/videos";
import { getUserCampaigns } from "@/lib/queries/campaigns";
import { VideosFilterBar } from "./VideosFilterBar";
import { formatStyle, groupVideosBySession } from "@/lib/video-utils";
import type { VideoStatus } from "@lore/shared";

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isSafeStorageUrl(url: string): boolean {
  if (!url) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function statusBadgeVariant(status: VideoStatus): "default" | "warning" | "danger" {
  if (status === "error") return "danger";
  if (status === "processing") return "warning";
  return "default";
}

function VideoCard({ video }: { video: VideoWithSession }) {
  const isCompleted = video.status === "completed";
  const duration = formatDuration(video.duration_seconds);
  const hasFile = video.storage_path !== null && isSafeStorageUrl(video.storage_path);
  const hasKeyframe = video.image_url !== null && isSafeStorageUrl(video.image_url ?? "");

  return (
    <Card className="group overflow-hidden">
      <CardContent className="p-0">
        <Link href={`/videos/${video.id}`}>
          <div className="relative flex h-44 items-center justify-center overflow-hidden bg-zinc-100 transition-colors group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700">
            {hasKeyframe ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.image_url!} alt={video.title} className="h-full w-full object-cover" />
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
        <div className="p-4">
          <Link
            href={`/videos/${video.id}`}
            className="font-medium text-zinc-900 hover:text-violet-600 dark:text-zinc-100 dark:hover:text-violet-400"
          >
            {video.title}
          </Link>
          <div className="mt-3 flex items-center justify-between">
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
}

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; campaign?: string }>;
}) {
  const [{ notice, campaign: campaignFilter }, allVideos, campaigns] = await Promise.all([
    searchParams,
    getAllUserVideosWithSession(),
    getUserCampaigns(),
  ]);

  const videos = campaignFilter
    ? allVideos.filter((v) => v.campaign_id === campaignFilter)
    : allVideos;

  const { sessions, ungrouped } = groupVideosBySession(videos);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Videos</h1>
          <p className="mt-1 text-sm text-zinc-500">AI-generated videos from your campaign sessions.</p>
        </div>
        <VideosFilterBar campaigns={campaigns} />
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
        <div className="space-y-10">
          {/* Session groups */}
          {sessions.map((session) => {
            const sessionLabel = session.session_number
              ? `Session ${session.session_number}`
              : null;
            const sessionDate = session.session_date
              ? new Date(session.session_date).toLocaleDateString()
              : null;

            const completedCount = session.videos.filter((v) => v.status === 'completed').length;

            return (
              <section key={session.transcript_id}>
                <div className="mb-4 flex items-center gap-3">
                  <ScrollText className="h-4 w-4 shrink-0 text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {sessionLabel ? `${sessionLabel} — ` : ''}{session.transcript_title}
                    </h2>
                    {sessionDate && (
                      <p className="text-xs text-zinc-500">{sessionDate}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {session.videos.length} {session.videos.length === 1 ? 'clip' : 'clips'}
                  </span>
                  {completedCount >= 2 && (
                    <Link
                      href={`/videos/reel/${session.transcript_id}`}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950/60"
                    >
                      <Play className="h-3 w-3" />
                      Watch Reel
                    </Link>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {session.videos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Ungrouped clips (no linked scene/transcript) */}
          {ungrouped.length > 0 && (
            <section>
              {sessions.length > 0 && (
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Other clips
                  </h2>
                  <span className="text-xs text-zinc-400">
                    {ungrouped.length} {ungrouped.length === 1 ? 'clip' : 'clips'}
                  </span>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ungrouped.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
