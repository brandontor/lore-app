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
