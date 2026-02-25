import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Video, Download, Share2, Calendar, Sword, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getVideoById } from "@/lib/queries/videos";
import { getCampaignById } from "@/lib/queries/campaigns";
import type { VideoStatus } from "@lore/shared";

function isSafeStorageUrl(path: string): boolean {
  if (path.startsWith("/")) return true;
  try {
    const url = new URL(path);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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

export default async function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const video = await getVideoById(id);
  if (!video) notFound();

  const campaign = await getCampaignById(video.campaign_id);
  const campaignName = campaign?.name ?? video.campaign_id;

  const generatedDate = new Date(video.created_at).toLocaleDateString();
  const duration = formatDuration(video.duration_seconds);
  const isCompleted = video.status === "completed";
  const hasFile = video.storage_path !== null && isSafeStorageUrl(video.storage_path);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/videos"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Videos
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {video.title}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-zinc-500">{campaignName}</p>
              {!isCompleted && (
                <Badge variant={statusBadgeVariant(video.status)}>
                  {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            {hasFile ? (
              <a href={video.storage_path!} download>
                <Button>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </a>
            ) : (
              <Button disabled>
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Video player */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              {hasFile ? (
                <video
                  src={video.storage_path!}
                  controls
                  aria-label={video.title}
                  className="w-full rounded-t-lg aspect-video bg-zinc-900"
                >
                  Your browser does not support the video element.
                </video>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-t-lg bg-zinc-900">
                  <div className="text-center">
                    <Video className="mx-auto mb-3 h-16 w-16 text-zinc-600" />
                    <p className="text-sm text-zinc-500">Video player coming soon</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-3 dark:border-zinc-800">
                <div className="flex items-center gap-3 text-sm text-zinc-500">
                  <span>{duration}</span>
                  <span>·</span>
                  <span>{generatedDate}</span>
                </div>
                {hasFile ? (
                  <a href={video.storage_path!} download>
                    <Button size="sm" variant="secondary">
                      <Download className="h-4 w-4" />
                      Download MP4
                    </Button>
                  </a>
                ) : (
                  <Button size="sm" variant="secondary" disabled>
                    <Download className="h-4 w-4" />
                    Download MP4
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metadata */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Video Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500">Generated</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{generatedDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Sword className="h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500">Campaign</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{campaignName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Palette className="h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500">Style</p>
                  <Badge variant="outline">{formatStyle(video.style)}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Source Transcripts</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500">Source transcripts linked during generation.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Share</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                <span className="flex-1 truncate text-xs text-zinc-500">
                  Share links — coming soon
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
