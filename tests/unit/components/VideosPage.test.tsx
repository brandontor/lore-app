import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildVideo, buildCampaignWithRole, CAMPAIGN_ID } from '../helpers/builders';

vi.mock('@/lib/queries/videos', () => ({
  getAllUserVideos: vi.fn(),
}));
vi.mock('@/lib/queries/campaigns', () => ({
  getUserCampaigns: vi.fn(),
  getCampaignById: vi.fn(),
}));

import { getAllUserVideos } from '@/lib/queries/videos';
import { getUserCampaigns } from '@/lib/queries/campaigns';
import VideosPage from '@/app/(app)/videos/page';

const mockGetAllUserVideos = vi.mocked(getAllUserVideos);
const mockGetUserCampaigns = vi.mocked(getUserCampaigns);

const CAMPAIGN = buildCampaignWithRole({ id: CAMPAIGN_ID, name: 'Curse of Strahd' });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserCampaigns.mockResolvedValue([CAMPAIGN]);
});

async function renderPage() {
  const jsx = await VideosPage();
  return render(jsx);
}

describe('VideosPage — empty state', () => {
  it('shows empty state when no videos exist', async () => {
    mockGetAllUserVideos.mockResolvedValue([]);
    await renderPage();
    expect(screen.getByText(/no videos yet/i)).toBeInTheDocument();
  });
});

describe('VideosPage — with videos', () => {
  it('renders video title as a link', async () => {
    const video = buildVideo({ title: 'The Siege of Barovia', campaign_id: CAMPAIGN_ID });
    mockGetAllUserVideos.mockResolvedValue([video]);
    await renderPage();
    const link = screen.getByRole('link', { name: /siege of barovia/i });
    expect(link).toHaveAttribute('href', `/videos/${video.id}`);
  });

  it('renders campaign name in the card subheading', async () => {
    mockGetAllUserVideos.mockResolvedValue([
      buildVideo({ campaign_id: CAMPAIGN_ID }),
    ]);
    await renderPage();
    expect(screen.getByText(/curse of strahd/i)).toBeInTheDocument();
  });

  it('formats duration_seconds as M:SS (154s → 2:34)', async () => {
    mockGetAllUserVideos.mockResolvedValue([
      buildVideo({ status: 'completed', duration_seconds: 154, campaign_id: CAMPAIGN_ID }),
    ]);
    await renderPage();
    expect(screen.getByText('2:34')).toBeInTheDocument();
  });

  it('renders style badge with formatted label', async () => {
    mockGetAllUserVideos.mockResolvedValue([
      buildVideo({ style: 'cinematic', campaign_id: CAMPAIGN_ID }),
    ]);
    await renderPage();
    expect(screen.getByText('Cinematic')).toBeInTheDocument();
  });

  it('renders status badge for non-completed videos', async () => {
    mockGetAllUserVideos.mockResolvedValue([
      buildVideo({ status: 'processing', campaign_id: CAMPAIGN_ID }),
    ]);
    await renderPage();
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('renders disabled download button when storage_path is null', async () => {
    mockGetAllUserVideos.mockResolvedValue([
      buildVideo({ storage_path: null, campaign_id: CAMPAIGN_ID }),
    ]);
    await renderPage();
    const downloadBtn = screen.getByRole('button', { name: /download/i });
    expect(downloadBtn).toBeDisabled();
  });

  it('renders download as a link when storage_path is set', async () => {
    mockGetAllUserVideos.mockResolvedValue([
      buildVideo({ storage_path: '/videos/abc.mp4', campaign_id: CAMPAIGN_ID }),
    ]);
    await renderPage();
    // Storage path present → renders as <a download>, not a <button>
    const downloadLink = screen.getByRole('link', { name: /download/i });
    expect(downloadLink).toHaveAttribute('href', '/videos/abc.mp4');
  });
});
