import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Calendar, Palette } from 'lucide-react';
import { getVideoByShareToken } from '@/lib/queries/videos';
import { getStorageUrl, formatStyle } from '@/lib/video-utils';

// Shared video content is immutable once published — cache for 1 hour.
export const revalidate = 3600;

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const video = await getVideoByShareToken(token);

  if (!video) notFound();

  const videoUrl = video.storage_path
    ? video.storage_path.startsWith('http')
      ? video.storage_path
      : getStorageUrl(video.storage_path)
    : null;

  const imageUrl = video.image_url ?? null;
  const generatedDate = new Date(video.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-violet-400" />
          <span className="text-lg font-bold text-white">Lore</span>
        </Link>
        <span className="text-sm text-zinc-500">{video.campaign_name}</span>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold text-white">{video.title}</h1>

        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            {formatStyle(video.style)}
          </span>
          <span className="text-zinc-600">·</span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {generatedDate}
          </span>
        </div>

        {/* Video player */}
        <div className="overflow-hidden rounded-xl bg-zinc-900">
          {videoUrl ? (
            <video
              src={videoUrl}
              poster={imageUrl ?? undefined}
              controls
              className="aspect-video w-full"
            />
          ) : imageUrl ? (
            /* Still generating or failed — show keyframe */
            <div className="relative aspect-video w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={video.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <p className="text-sm text-zinc-300">Video unavailable</p>
              </div>
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center">
              <p className="text-sm text-zinc-500">Video unavailable</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer CTA */}
      <footer className="border-t border-zinc-800 px-6 py-6 text-center">
        <p className="text-sm text-zinc-500">
          Create your own D&amp;D session highlight reels with{' '}
          <Link href="/" className="text-violet-400 hover:text-violet-300">
            Lore
          </Link>
        </p>
      </footer>
    </div>
  );
}
