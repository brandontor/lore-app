import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { buildTranscript, buildCampaignWithRole, CAMPAIGN_ID } from '../helpers/builders';

vi.mock('@/lib/queries/transcripts', () => ({
  getTranscriptById: vi.fn(),
}));
vi.mock('@/lib/queries/campaigns', () => ({
  getCampaignById: vi.fn(),
  getUserCampaigns: vi.fn(),
}));

import { getTranscriptById } from '@/lib/queries/transcripts';
import { getCampaignById } from '@/lib/queries/campaigns';
import TranscriptDetailPage from '@/app/(app)/transcripts/[id]/page';

const mockGetTranscriptById = vi.mocked(getTranscriptById);
const mockGetCampaignById = vi.mocked(getCampaignById);

const CAMPAIGN = buildCampaignWithRole({ id: CAMPAIGN_ID, name: 'Curse of Strahd' });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCampaignById.mockResolvedValue(CAMPAIGN);
});

async function renderPage(id = 'transcript-1') {
  const jsx = await TranscriptDetailPage({ params: Promise.resolve({ id }) });
  return render(jsx);
}

describe('TranscriptDetailPage — not found', () => {
  it('calls notFound() when transcript does not exist', async () => {
    mockGetTranscriptById.mockResolvedValue(null);
    // notFound() is a no-op vi.fn(); execution continues and crashes on null access — catch it
    try { await renderPage(); } catch { /* expected TypeError on null access */ }
    expect(notFound).toHaveBeenCalled();
  });

  it('calls notFound() when user has no access to the campaign', async () => {
    mockGetTranscriptById.mockResolvedValue(
      buildTranscript({ campaign_id: CAMPAIGN_ID })
    );
    mockGetCampaignById.mockResolvedValue(null);
    // Same pattern: notFound() is a no-op, page crashes on null.name access
    try { await renderPage(); } catch { /* expected */ }
    expect(notFound).toHaveBeenCalled();
  });
});

describe('TranscriptDetailPage — with transcript', () => {
  it('renders the transcript title', async () => {
    mockGetTranscriptById.mockResolvedValue(
      buildTranscript({ title: 'Session 14', campaign_id: CAMPAIGN_ID })
    );
    await renderPage();
    expect(screen.getByText('Session 14')).toBeInTheDocument();
  });

  it('renders the campaign name', async () => {
    mockGetTranscriptById.mockResolvedValue(
      buildTranscript({ campaign_id: CAMPAIGN_ID })
    );
    await renderPage();
    expect(screen.getAllByText('Curse of Strahd').length).toBeGreaterThan(0);
  });

  it('renders the status badge', async () => {
    mockGetTranscriptById.mockResolvedValue(
      buildTranscript({ status: 'processed', campaign_id: CAMPAIGN_ID })
    );
    await renderPage();
    expect(screen.getByText('processed')).toBeInTheDocument();
  });

  it('renders transcript content in a pre element', async () => {
    mockGetTranscriptById.mockResolvedValue(
      buildTranscript({ content: 'The party entered the tavern.', campaign_id: CAMPAIGN_ID })
    );
    await renderPage();
    expect(screen.getByText('The party entered the tavern.')).toBeInTheDocument();
  });

  it('formats duration_minutes as Xh Ym in metadata (222 → 3h 42m)', async () => {
    mockGetTranscriptById.mockResolvedValue(
      buildTranscript({ duration_minutes: 222, campaign_id: CAMPAIGN_ID })
    );
    await renderPage();
    expect(screen.getByText('3h 42m')).toBeInTheDocument();
  });

  it('renders the source badge', async () => {
    mockGetTranscriptById.mockResolvedValue(
      buildTranscript({ source: 'manual', campaign_id: CAMPAIGN_ID })
    );
    await renderPage();
    expect(screen.getByText('manual')).toBeInTheDocument();
  });

  it('renders "—" for duration when duration_minutes is null', async () => {
    mockGetTranscriptById.mockResolvedValue(
      buildTranscript({ duration_minutes: null, campaign_id: CAMPAIGN_ID })
    );
    await renderPage();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
