import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { buildVideo, buildCampaignWithRole, CAMPAIGN_ID } from '../helpers/builders';

vi.mock('@/lib/queries/videos', () => ({
  getVideoById: vi.fn(),
}));
vi.mock('@/lib/queries/campaigns', () => ({
  getCampaignById: vi.fn(),
  getUserCampaigns: vi.fn(),
}));

import { getVideoById } from '@/lib/queries/videos';
import { getCampaignById } from '@/lib/queries/campaigns';
import VideoDetailPage from '@/app/(app)/videos/[id]/page';

const mockGetVideoById = vi.mocked(getVideoById);
const mockGetCampaignById = vi.mocked(getCampaignById);

const CAMPAIGN = buildCampaignWithRole({ id: CAMPAIGN_ID, name: 'Curse of Strahd' });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCampaignById.mockResolvedValue(CAMPAIGN);
});

async function renderPage(id = 'video-1') {
  const jsx = await VideoDetailPage({ params: Promise.resolve({ id }) });
  return render(jsx);
}

describe('VideoDetailPage — not found', () => {
  it('calls notFound() when video does not exist', async () => {
    mockGetVideoById.mockResolvedValue(null);
    // notFound() is a vi.fn() that doesn't throw; page crashes afterwards — catch and assert
    try { await renderPage(); } catch { /* expected */ }
    expect(notFound).toHaveBeenCalled();
  });
});

describe('VideoDetailPage — with video', () => {
  it('renders the video title', async () => {
    mockGetVideoById.mockResolvedValue(
      buildVideo({ title: 'The Amber Temple Revelation', campaign_id: CAMPAIGN_ID })
    );
    await renderPage();
    expect(screen.getByText('The Amber Temple Revelation')).toBeInTheDocument();
  });

  it('renders the campaign name as subheading', async () => {
    mockGetVideoById.mockResolvedValue(
      buildVideo({ campaign_id: CAMPAIGN_ID })
    );
    await renderPage();
    // Campaign name appears in both header subheading and metadata sidebar
    expect(screen.getAllByText('Curse of Strahd').length).toBeGreaterThan(0);
  });

  it('renders the style badge with formatted label', async () => {
    mockGetVideoById.mockResolvedValue(
      buildVideo({ style: 'dark-fantasy', campaign_id: CAMPAIGN_ID })
    );
    await renderPage();
    expect(screen.getByText('Dark Fantasy')).toBeInTheDocument();
  });

  it('formats duration_seconds as M:SS (154s → 2:34)', async () => {
    mockGetVideoById.mockResolvedValue(
      buildVideo({ duration_seconds: 154, campaign_id: CAMPAIGN_ID })
    );
    await renderPage();
    expect(screen.getByText('2:34')).toBeInTheDocument();
  });

  it('renders a video element with src when storage_path is set', async () => {
    mockGetVideoById.mockResolvedValue(
      buildVideo({ storage_path: '/videos/abc.mp4', campaign_id: CAMPAIGN_ID })
    );
    const { container } = await renderPage();
    const videoEl = container.querySelector('video');
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).toHaveAttribute('src', '/videos/abc.mp4');
  });

  it('shows placeholder when storage_path is null', async () => {
    mockGetVideoById.mockResolvedValue(
      buildVideo({ storage_path: null, campaign_id: CAMPAIGN_ID })
    );
    const { container } = await renderPage();
    expect(container.querySelector('video')).not.toBeInTheDocument();
    expect(screen.getByText(/video player coming soon/i)).toBeInTheDocument();
  });

  it('download button is disabled when storage_path is null', async () => {
    mockGetVideoById.mockResolvedValue(
      buildVideo({ storage_path: null, campaign_id: CAMPAIGN_ID })
    );
    await renderPage();
    const downloadBtns = screen.getAllByRole('button', { name: /download/i });
    downloadBtns.forEach((btn) => expect(btn).toBeDisabled());
  });
});
