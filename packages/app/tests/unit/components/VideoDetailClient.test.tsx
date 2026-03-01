import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoDetailClient } from '@/app/(app)/videos/[id]/VideoDetailClient';
import { buildVideo, buildTranscript } from '../helpers/builders';

const IMAGE_URL =
  'https://example.supabase.co/storage/v1/object/public/campaign-videos/camp/vid_keyframe.jpg';
const VIDEO_URL =
  'https://example.supabase.co/storage/v1/object/public/campaign-videos/camp/vid.mp4';

beforeEach(() => {
  vi.useFakeTimers();
  // Prevent real network calls from polling interval
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('VideoDetailClient — keyframe + spinner', () => {
  it('shows keyframe image with spinner overlay when pending and image_url is set', () => {
    render(
      <VideoDetailClient
        video={buildVideo({ status: 'pending', image_url: IMAGE_URL })}
        sourceTranscript={null}
      />
    );
    expect(screen.getByAltText('Scene keyframe')).toHaveAttribute('src', IMAGE_URL);
    expect(screen.getByText(/queued for generation/i)).toBeInTheDocument();
  });

  it('shows "Generating video…" text when status is processing', () => {
    render(
      <VideoDetailClient
        video={buildVideo({ status: 'processing', image_url: IMAGE_URL })}
        sourceTranscript={null}
      />
    );
    expect(screen.getByAltText('Scene keyframe')).toBeInTheDocument();
    expect(screen.getByText(/generating video/i)).toBeInTheDocument();
  });

  it('shows text placeholder without keyframe when pending and image_url is null', () => {
    render(
      <VideoDetailClient
        video={buildVideo({ status: 'pending', image_url: null })}
        sourceTranscript={null}
      />
    );
    expect(screen.queryByAltText('Scene keyframe')).not.toBeInTheDocument();
    expect(screen.getByText(/queued for generation/i)).toBeInTheDocument();
  });
});

describe('VideoDetailClient — completed / error states', () => {
  it('renders video player when completed with storage_path', () => {
    const { container } = render(
      <VideoDetailClient
        video={buildVideo({ status: 'completed', storage_path: VIDEO_URL })}
        sourceTranscript={null}
      />
    );
    expect(container.querySelector('video')).toHaveAttribute('src', VIDEO_URL);
  });

  it('shows error state when status is error', () => {
    render(
      <VideoDetailClient
        video={buildVideo({ status: 'error', image_url: null })}
        sourceTranscript={null}
      />
    );
    expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
  });
});

describe('VideoDetailClient — source transcript panel', () => {
  it('shows transcript link when sourceTranscript is provided', () => {
    const transcript = buildTranscript({ title: 'The Amber Temple' });
    render(
      <VideoDetailClient
        video={buildVideo({ status: 'pending' })}
        sourceTranscript={transcript}
      />
    );
    expect(screen.getByRole('link', { name: /amber temple/i })).toBeInTheDocument();
  });

  it('shows fallback message when sourceTranscript is null', () => {
    render(
      <VideoDetailClient
        video={buildVideo({ status: 'pending' })}
        sourceTranscript={null}
      />
    );
    expect(screen.getByText(/no source transcript linked/i)).toBeInTheDocument();
  });
});
