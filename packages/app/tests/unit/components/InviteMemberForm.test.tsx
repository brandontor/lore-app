import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteMemberForm } from '@/components/campaigns/InviteMemberForm';
import { CAMPAIGN_ID } from '../helpers/builders';

const mockSendInvitation = vi.fn();

vi.mock('@/lib/actions/invitations', () => ({
  sendInvitation: (...args: unknown[]) => mockSendInvitation(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSendInvitation.mockResolvedValue({});
});

describe('InviteMemberForm', () => {
  it('renders email input, permission select, and submit button', () => {
    render(<InviteMemberForm campaignId={CAMPAIGN_ID} />);
    expect(screen.getByPlaceholderText(/player@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send invite/i })).toBeInTheDocument();
  });

  it('shows success message after successful submission', async () => {
    mockSendInvitation.mockResolvedValue({});
    const user = userEvent.setup();
    render(<InviteMemberForm campaignId={CAMPAIGN_ID} />);
    await user.type(screen.getByPlaceholderText(/player@example.com/i), 'player@example.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByText(/invitation sent/i)).toBeInTheDocument();
  });

  it('shows error message when action returns an error', async () => {
    mockSendInvitation.mockResolvedValue({ error: 'An invitation for this email already exists' });
    const user = userEvent.setup();
    render(<InviteMemberForm campaignId={CAMPAIGN_ID} />);
    await user.type(screen.getByPlaceholderText(/player@example.com/i), 'player@example.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });

  it('disables the button while submission is pending', async () => {
    let resolve: (v: unknown) => void;
    mockSendInvitation.mockReturnValue(new Promise((r) => { resolve = r; }));
    const user = userEvent.setup();
    render(<InviteMemberForm campaignId={CAMPAIGN_ID} />);
    await user.type(screen.getByPlaceholderText(/player@example.com/i), 'player@example.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(screen.getByRole('button')).toBeDisabled();
    resolve!({});
  });

  it('shows "Sending…" text while pending', async () => {
    let resolve: (v: unknown) => void;
    mockSendInvitation.mockReturnValue(new Promise((r) => { resolve = r; }));
    const user = userEvent.setup();
    render(<InviteMemberForm campaignId={CAMPAIGN_ID} />);
    await user.type(screen.getByPlaceholderText(/player@example.com/i), 'player@example.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByText(/sending/i)).toBeInTheDocument();
    resolve!({});
  });
});
