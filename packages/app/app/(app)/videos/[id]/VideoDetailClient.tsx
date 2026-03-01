"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Video, Download, ScrollText, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Video as VideoType, Transcript, VideoStatus } from "@lore/shared";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

/** Maximum number of polls before giving up (5s × 60 = 5 minutes). */
const MAX_POLLS = 60;

function getStorageUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/campaign-videos/${storagePath}`;
}

function isSafeUrl(path: string): boolean {
  if (!path) return false;
  try {
    const url = new URL(path.startsWith('/') ? `https://x.com${path}` : path);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function statusBadgeVariant(status: VideoStatus): 'warning' | 'danger' {
  return status === 'error' ? 'danger' : 'warning';
}

interface StatusPollResponse {
  status: VideoStatus;
  storage_path: string | null;
}

export function VideoDetailClient({
  video: initialVideo,
  sourceTranscript,
}: {
  video: VideoType;
  sourceTranscript: Transcript | null;
}) {
  const [video, setVideo] = useState(initialVideo);
  const pollCountRef = useRef(0);

  const isPending = video.status === 'pending' || video.status === 'processing';
  const isError = video.status === 'error';

  const pollStatus = useCallback(async () => {
    pollCountRef.current += 1;
    // Stop polling after MAX_POLLS attempts and surface a timeout error
    if (pollCountRef.current > MAX_POLLS) {
      setVideo((prev) => ({ ...prev, status: 'error' }));
      return;
    }
    try {
      const res = await fetch(`/api/videos/${video.id}/status`);
      if (!res.ok) return;
      const data: StatusPollResponse = await res.json();
      setVideo((prev) => ({
        ...prev,
        status: data.status,
        storage_path: data.storage_path ?? prev.storage_path,
      }));
    } catch {
      // Ignore transient fetch errors
    }
  }, [video.id]);

  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [isPending, pollStatus]);

  const storagePath = video.storage_path;
  const videoUrl = storagePath
    ? storagePath.startsWith('http')
      ? storagePath
      : getStorageUrl(storagePath)
    : null;
  const hasFile = videoUrl !== null && isSafeUrl(videoUrl);
  const duration = formatDuration(video.duration_seconds);

  return (
    <>
      {/* Video player card */}
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="p-0">
            {hasFile ? (
              <video
                src={videoUrl!}
                controls
                aria-label={video.title}
                className="w-full rounded-t-lg aspect-video bg-zinc-900"
              >
                Your browser does not support the video element.
              </video>
            ) : isPending && video.image_url ? (
              <div className="relative aspect-video rounded-t-lg overflow-hidden bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={video.image_url}
                  alt="Scene keyframe"
                  className="h-full w-full object-cover opacity-60"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                  <p className="mt-2 text-sm text-white">
                    {video.status === 'processing' ? 'Generating video…' : 'Queued for generation…'}
                  </p>
                  <p className="mt-1 text-xs text-white/60">This page updates automatically.</p>
                </div>
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-t-lg bg-zinc-900">
                <div className="text-center">
                  {isError ? (
                    <AlertCircle className="mx-auto mb-3 h-16 w-16 text-red-500" />
                  ) : (
                    <Video className="mx-auto mb-3 h-16 w-16 text-zinc-600" />
                  )}
                  {isPending ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-zinc-400">
                        {video.status === 'processing' ? 'Generating video…' : 'Queued for generation…'}
                      </p>
                      <p className="text-xs text-zinc-600">This usually takes 1–3 minutes. This page updates automatically.</p>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      {isError ? 'Generation failed' : 'Video not available'}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-3 dark:border-zinc-800">
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <span>{duration}</span>
                {/* Show status badge for both pending and error states */}
                {(isPending || isError) && (
                  <>
                    <span>·</span>
                    <Badge variant={statusBadgeVariant(video.status)}>
                      {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                    </Badge>
                  </>
                )}
              </div>
              {hasFile ? (
                <a href={videoUrl!} download>
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

      {/* Source Transcript panel */}
      <Card>
        <CardHeader>
          <CardTitle>Source Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          {sourceTranscript ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <Link
                    href={`/transcripts/${sourceTranscript.id}`}
                    className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
                  >
                    {sourceTranscript.title ||
                      (sourceTranscript.session_number !== null
                        ? `Session ${sourceTranscript.session_number}`
                        : 'Untitled')}
                  </Link>
                  {sourceTranscript.session_date && (
                    <p className="text-xs text-zinc-500">
                      {new Date(sourceTranscript.session_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No source transcript linked.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
