import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildTranscript, buildCampaignWithRole, CAMPAIGN_ID } from '../helpers/builders';

vi.mock('@/lib/queries/transcripts', () => ({
  getAllUserTranscripts: vi.fn(),
}));
vi.mock('@/lib/queries/campaigns', () => ({
  getUserCampaigns: vi.fn(),
}));

import { getAllUserTranscripts } from '@/lib/queries/transcripts';
import { getUserCampaigns } from '@/lib/queries/campaigns';
import TranscriptsPage from '@/app/(app)/transcripts/page';

const mockGetAllUserTranscripts = vi.mocked(getAllUserTranscripts);
const mockGetUserCampaigns = vi.mocked(getUserCampaigns);

const CAMPAIGN = buildCampaignWithRole({ id: CAMPAIGN_ID, name: 'Curse of Strahd' });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserCampaigns.mockResolvedValue([CAMPAIGN]);
});

async function renderPage() {
  const jsx = await TranscriptsPage();
  return render(jsx);
}

describe('TranscriptsPage — empty state', () => {
  it('shows empty state when no transcripts exist', async () => {
    mockGetAllUserTranscripts.mockResolvedValue([]);
    await renderPage();
    expect(screen.getByText(/no transcripts yet/i)).toBeInTheDocument();
  });
});

describe('TranscriptsPage — with transcripts', () => {
  it('renders transcript title in the table', async () => {
    mockGetAllUserTranscripts.mockResolvedValue([
      buildTranscript({ title: 'The Gates of Barovia', campaign_id: CAMPAIGN_ID }),
    ]);
    await renderPage();
    expect(screen.getByText('The Gates of Barovia')).toBeInTheDocument();
  });

  it('renders campaign name from the campaign lookup', async () => {
    mockGetAllUserTranscripts.mockResolvedValue([
      buildTranscript({ campaign_id: CAMPAIGN_ID }),
    ]);
    await renderPage();
    expect(screen.getByText('Curse of Strahd')).toBeInTheDocument();
  });

  it('formats duration_minutes as Xh Ym (222 → 3h 42m)', async () => {
    mockGetAllUserTranscripts.mockResolvedValue([
      buildTranscript({ duration_minutes: 222, campaign_id: CAMPAIGN_ID }),
    ]);
    await renderPage();
    expect(screen.getByText('3h 42m')).toBeInTheDocument();
  });

  it('renders a View link to the transcript detail page', async () => {
    const transcript = buildTranscript({ campaign_id: CAMPAIGN_ID });
    mockGetAllUserTranscripts.mockResolvedValue([transcript]);
    await renderPage();
    const link = screen.getByRole('link', { name: /view/i });
    expect(link).toHaveAttribute('href', `/transcripts/${transcript.id}`);
  });

  it('renders source badge', async () => {
    mockGetAllUserTranscripts.mockResolvedValue([
      buildTranscript({ source: 'discord', campaign_id: CAMPAIGN_ID }),
    ]);
    await renderPage();
    expect(screen.getByText('discord')).toBeInTheDocument();
  });

  it('renders status badge', async () => {
    mockGetAllUserTranscripts.mockResolvedValue([
      buildTranscript({ status: 'processed', campaign_id: CAMPAIGN_ID }),
    ]);
    await renderPage();
    expect(screen.getByText('processed')).toBeInTheDocument();
  });

  it('renders "Session N" label when title is empty but session_number is set', async () => {
    mockGetAllUserTranscripts.mockResolvedValue([
      buildTranscript({ title: '', session_number: 7, campaign_id: CAMPAIGN_ID }),
    ]);
    await renderPage();
    expect(screen.getByText('Session 7')).toBeInTheDocument();
  });

  it('renders "—" label when both title and session_number are absent', async () => {
    mockGetAllUserTranscripts.mockResolvedValue([
      buildTranscript({ title: '', session_number: null, campaign_id: CAMPAIGN_ID }),
    ]);
    await renderPage();
    // "—" appears in both the session label and duration column
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('renders "—" in duration column when duration_minutes is null', async () => {
    mockGetAllUserTranscripts.mockResolvedValue([
      buildTranscript({ duration_minutes: null, campaign_id: CAMPAIGN_ID }),
    ]);
    await renderPage();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
