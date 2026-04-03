"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Video } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatStyle } from "@/lib/video-utils";
import type { VideoWithSession } from "@/lib/queries/videos";

interface ReelPlayerProps {
  videos: VideoWithSession[];
  transcriptTitle: string;
  sessionNumber: number | null;
}

export function ReelPlayer({ videos: allVideos, transcriptTitle, sessionNumber }: ReelPlayerProps) {
  // Guard: only play clips that have a file ready (completed but missing storage_path is theoretically possible)
  const videos = allVideos.filter((v) => v.storage_path !== null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load and play whenever the active clip changes (must be before any early return)
  useEffect(() => {
    const el = videoRef.current;
    if (!el || videos.length === 0) return;
    el.load();
    el.play().catch(() => {
      // Autoplay blocked by browser — user can click play manually
    });
  }, [currentIndex, videos.length]);

  if (videos.length === 0) {
    return <p className="text-sm text-zinc-500">No playable clips available yet.</p>;
  }

  const current = videos[currentIndex];
  const sessionLabel = sessionNumber ? `Session ${sessionNumber}` : null;

  function goTo(index: number) {
    if (index < 0 || index >= videos.length) return;
    setCurrentIndex(index);
  }

  function handleEnded() {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }


  return (
    <div className="space-y-4">
      {/* Session header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {sessionLabel ? `${sessionLabel} — ` : ''}{transcriptTitle}
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {videos.length} {videos.length === 1 ? 'clip' : 'clips'}
        </p>
      </div>

      {/* Main player */}
      <div className="overflow-hidden rounded-xl bg-black shadow-lg">
        <video
          ref={videoRef}
          src={current.storage_path as string}
          poster={current.image_url ?? undefined}
          controls
          onEnded={handleEnded}
          className="aspect-video w-full"
        />
      </div>

      {/* Clip info + navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate font-medium text-zinc-900 dark:text-zinc-100">
            {current.title}
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline">{formatStyle(current.style)}</Badge>
            <span className="text-xs text-zinc-400">
              {currentIndex + 1} / {videos.length}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
            aria-label="Previous clip"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => goTo(currentIndex + 1)}
            disabled={currentIndex === videos.length - 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
            aria-label="Next clip"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {videos.map((video, i) => (
          <button
            key={video.id}
            onClick={() => goTo(i)}
            className={`group relative shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
              i === currentIndex
                ? 'border-violet-500 shadow-md'
                : 'border-transparent opacity-60 hover:opacity-90'
            }`}
            aria-label={`Play clip ${i + 1}: ${video.title}`}
          >
            <div className="relative h-16 w-28 bg-zinc-100 dark:bg-zinc-800">
              {video.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.image_url}
                  alt={video.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Video className="h-5 w-5 text-zinc-400" />
                </div>
              )}
              {/* Clip number badge */}
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-xs font-medium text-white">
                {i + 1}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
