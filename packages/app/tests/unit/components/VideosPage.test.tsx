import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildVideo, buildCampaignWithRole, CAMPAIGN_ID } from '../helpers/builders';
import type { VideoWithSession } from '@/lib/queries/videos';

vi.mock('@/lib/queries/videos', () => ({
  getAllUserVideosWithSession: vi.fn(),
  groupVideosBySession: vi.fn(),
}));
vi.mock('@/lib/queries/campaigns', () => ({
  getUserCampaigns: vi.fn(),
}));

import { getAllUserVideosWithSession, groupVideosBySession } from '@/lib/queries/videos';
import { getUserCampaigns } from '@/lib/queries/campaigns';
import VideosPage from '@/app/(app)/videos/page';

const mockGetAllUserVideosWithSession = vi.mocked(getAllUserVideosWithSession);
const mockGroupVideosBySession = vi.mocked(groupVideosBySession);
const mockGetUserCampaigns = vi.mocked(getUserCampaigns);

const CAMPAIGN = buildCampaignWithRole({ id: CAMPAIGN_ID, name: 'Curse of Strahd' });

function buildVideoWithSession(overrides: Partial<VideoWithSession> = {}): VideoWithSession {
  return {
    ...buildVideo({ campaign_id: CAMPAIGN_ID }),
    transcript_id: null,
    transcript_title: null,
    session_number: null,
    session_date: null,
    scene_start_timestamp: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserCampaigns.mockResolvedValue([CAMPAIGN]);
  // Default: no sessions, all ungrouped — mirrors the flat-list behaviour tested below
  mockGroupVideosBySession.mockImplementation((videos) => ({
    sessions: [],
    ungrouped: videos,
  }));
});

async function renderPage(notice?: string) {
  const jsx = await VideosPage({ searchParams: Promise.resolve(notice ? { notice } : {}) });
  return render(jsx);
}

describe('VideosPage — empty state', () => {
  it('shows empty state when no videos exist', async () => {
    mockGetAllUserVideosWithSession.mockResolvedValue([]);
    await renderPage();
    expect(screen.getByText(/no videos yet/i)).toBeInTheDocument();
  });
});

describe('VideosPage — with videos', () => {
  it('renders video title as a link', async () => {
    const video = buildVideoWithSession({ title: 'The Siege of Barovia' });
    mockGetAllUserVideosWithSession.mockResolvedValue([video]);
    await renderPage();
    const link = screen.getByRole('link', { name: /siege of barovia/i });
    expect(link).toHaveAttribute('href', `/videos/${video.id}`);
  });

  it('formats duration_seconds as M:SS (154s → 2:34)', async () => {
    mockGetAllUserVideosWithSession.mockResolvedValue([
      buildVideoWithSession({ status: 'completed', duration_seconds: 154 }),
    ]);
    await renderPage();
    expect(screen.getByText('2:34')).toBeInTheDocument();
  });

  it('renders style badge with formatted label', async () => {
    mockGetAllUserVideosWithSession.mockResolvedValue([
      buildVideoWithSession({ style: 'cinematic' }),
    ]);
    await renderPage();
    expect(screen.getByText('Cinematic')).toBeInTheDocument();
  });

  it('renders status badge for non-completed videos', async () => {
    mockGetAllUserVideosWithSession.mockResolvedValue([
      buildVideoWithSession({ status: 'processing' }),
    ]);
    await renderPage();
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('renders disabled download button when storage_path is null', async () => {
    mockGetAllUserVideosWithSession.mockResolvedValue([
      buildVideoWithSession({ storage_path: null }),
    ]);
    await renderPage();
    const downloadBtn = screen.getByRole('button', { name: /download/i });
    expect(downloadBtn).toBeDisabled();
  });

  it('renders download as a link when storage_path is set', async () => {
    const storagePath = 'https://example.supabase.co/storage/v1/object/public/campaign-videos/abc.mp4';
    mockGetAllUserVideosWithSession.mockResolvedValue([
      buildVideoWithSession({ storage_path: storagePath }),
    ]);
    await renderPage();
    const downloadLink = screen.getByRole('link', { name: /download/i });
    expect(downloadLink).toHaveAttribute('href', storagePath);
  });

  it('renders keyframe thumbnail when image_url is set', async () => {
    const imageUrl = 'https://example.supabase.co/storage/v1/object/public/campaign-videos/camp/vid_keyframe.jpg';
    mockGetAllUserVideosWithSession.mockResolvedValue([
      buildVideoWithSession({ image_url: imageUrl }),
    ]);
    await renderPage();
    const img = screen.getByRole('img', { name: /epic encounter/i });
    expect(img).toHaveAttribute('src', imageUrl);
  });

  it('renders session header when groupVideosBySession returns a session', async () => {
    const video = buildVideoWithSession({
      transcript_id: 'trans-1',
      transcript_title: 'Session 3 — The Dark Descent',
      session_number: 3,
    });
    mockGetAllUserVideosWithSession.mockResolvedValue([video]);
    mockGroupVideosBySession.mockReturnValue({
      sessions: [{
        transcript_id: 'trans-1',
        transcript_title: 'The Dark Descent',
        session_number: 3,
        session_date: null,
        videos: [video],
      }],
      ungrouped: [],
    });
    await renderPage();
    expect(screen.getByText(/session 3/i)).toBeInTheDocument();
    expect(screen.getByText(/the dark descent/i)).toBeInTheDocument();
  });
});
