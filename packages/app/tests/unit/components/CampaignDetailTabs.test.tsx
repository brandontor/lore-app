import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignDetailTabs } from '@/app/(app)/campaigns/[id]/CampaignDetailTabs';
import { renderWithCampaignContext } from '../helpers/campaign-context';
import {
  buildCampaignWithRole,
  buildTranscript,
  buildMember,
} from '../helpers/builders';

const baseProps = {
  campaign: buildCampaignWithRole({ userRole: 'owner' }),
  transcripts: [],
  characters: [],
  videos: [],
  members: [],
  discordChannels: [],
};

describe('CampaignDetailTabs — tab visibility', () => {
  it('shows Members tab for owner', () => {
    renderWithCampaignContext(<CampaignDetailTabs {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Members' })).toBeInTheDocument();
  });

  it('hides Members tab for read member', () => {
    const props = { ...baseProps, campaign: buildCampaignWithRole({ userRole: 'read' }) };
    renderWithCampaignContext(<CampaignDetailTabs {...props} />);
    expect(screen.queryByRole('button', { name: 'Members' })).not.toBeInTheDocument();
  });

  it('hides Members tab for write member', () => {
    const props = { ...baseProps, campaign: buildCampaignWithRole({ userRole: 'write' }) };
    renderWithCampaignContext(<CampaignDetailTabs {...props} />);
    expect(screen.queryByRole('button', { name: 'Members' })).not.toBeInTheDocument();
  });
});

describe('CampaignDetailTabs — header buttons', () => {
  it('shows Edit and Generate Video buttons for owner', () => {
    renderWithCampaignContext(<CampaignDetailTabs {...baseProps} />);
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /generate video/i })).toBeInTheDocument();
  });

  it('shows only Generate Video for write member (no Edit)', () => {
    const props = { ...baseProps, campaign: buildCampaignWithRole({ userRole: 'write' }) };
    renderWithCampaignContext(<CampaignDetailTabs {...props} />);
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /generate video/i })).toBeInTheDocument();
  });

  it('shows neither Edit nor Generate Video for read member', () => {
    const props = { ...baseProps, campaign: buildCampaignWithRole({ userRole: 'read' }) };
    renderWithCampaignContext(<CampaignDetailTabs {...props} />);
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /generate video/i })).not.toBeInTheDocument();
  });
});

describe('CampaignDetailTabs — Discord Bot card', () => {
  it('shows "Not connected" when no channels are linked', () => {
    renderWithCampaignContext(<CampaignDetailTabs {...baseProps} />);
    expect(screen.getByText(/not connected/i)).toBeInTheDocument();
  });

  it('shows channel name and guild name when channels are linked', () => {
    const props = {
      ...baseProps,
      discordChannels: [
        {
          channel_id: '111111111111111111',
          campaign_id: baseProps.campaign.id,
          created_at: '2024-01-03T10:00:00Z',
          channel_name: 'session-room',
          guild_name: 'Adventurers Guild',
        },
      ],
    };
    renderWithCampaignContext(<CampaignDetailTabs {...props} />);
    expect(screen.getByText('#session-room')).toBeInTheDocument();
    expect(screen.getByText(/adventurers guild/i)).toBeInTheDocument();
  });

  it('falls back to truncated channel_id and "Unknown server" when names are null', () => {
    const props = {
      ...baseProps,
      discordChannels: [
        {
          channel_id: '123456789012345678',
          campaign_id: baseProps.campaign.id,
          created_at: '2024-01-03T10:00:00Z',
          channel_name: null,
          guild_name: null,
        },
      ],
    };
    renderWithCampaignContext(<CampaignDetailTabs {...props} />);
    expect(screen.getByText('#12345678…')).toBeInTheDocument();
    expect(screen.getByText(/unknown server/i)).toBeInTheDocument();
  });
});

describe('CampaignDetailTabs — tab content', () => {
  it('shows empty state when transcripts array is empty', async () => {
    const user = userEvent.setup();
    renderWithCampaignContext(<CampaignDetailTabs {...baseProps} />);
    await user.click(screen.getByRole('button', { name: 'Transcripts' }));
    expect(screen.getByText(/no transcripts yet/i)).toBeInTheDocument();
  });

  it('renders transcript rows when transcripts exist', async () => {
    const user = userEvent.setup();
    const props = { ...baseProps, transcripts: [buildTranscript({ title: 'Session One' })] };
    renderWithCampaignContext(<CampaignDetailTabs {...props} />);
    await user.click(screen.getByRole('button', { name: 'Transcripts' }));
    expect(screen.getByText('Session One')).toBeInTheDocument();
  });

  it('shows stats counts in Overview tab', () => {
    const props = {
      ...baseProps,
      transcripts: [buildTranscript()],
      members: [buildMember()],
    };
    renderWithCampaignContext(<CampaignDetailTabs {...props} />);
    // Members stat = members.length + 1 (owner)
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
