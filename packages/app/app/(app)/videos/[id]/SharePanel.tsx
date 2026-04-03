'use client';

import { useState, useTransition, useRef } from 'react';
import { Link2, Link2Off, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { shareVideo, unshareVideo } from '@/lib/actions/videos';
import type { VideoStatus } from '@lore/shared';

interface SharePanelProps {
  videoId: string;
  status: VideoStatus;
  isShared: boolean;
  shareToken: string | null;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

export function SharePanel({ videoId, status, isShared: initialShared, shareToken: initialToken }: SharePanelProps) {
  const [isPending, startTransition] = useTransition();
  const [isShared, setIsShared] = useState(initialShared);
  const [shareToken, setShareToken] = useState<string | null>(initialToken);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareUrl = shareToken ? `${APP_URL}/share/${shareToken}` : null;
  const isCompleted = status === 'completed';

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShare() {
    setError(null);
    startTransition(async () => {
      const result = await shareVideo(videoId);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setIsShared(true);
        setShareToken(result.data.token);
      }
    });
  }

  function handleUnshare() {
    setError(null);
    startTransition(async () => {
      const result = await unshareVideo(videoId);
      if (result.error) {
        setError(result.error);
      } else {
        setIsShared(false);
        setShareToken(null);
      }
    });
  }

  if (!isCompleted) {
    return (
      <p className="text-sm text-zinc-500">
        Share links are available once the video has finished generating.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {isShared && shareUrl ? (
        <>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
            <span className="flex-1 truncate text-xs text-zinc-600 dark:text-zinc-400">
              {shareUrl}
            </span>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
              title="Copy link"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <Button
            variant="secondary"
            onClick={handleUnshare}
            disabled={isPending}
            className="w-full"
          >
            <Link2Off className="h-4 w-4" />
            {isPending ? 'Removing…' : 'Remove link'}
          </Button>
        </>
      ) : (
        <Button
          onClick={handleShare}
          disabled={isPending}
          className="w-full"
        >
          <Link2 className="h-4 w-4" />
          {isPending ? 'Generating…' : 'Create share link'}
        </Button>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
