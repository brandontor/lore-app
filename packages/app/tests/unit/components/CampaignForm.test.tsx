import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignForm } from '@/components/campaigns/CampaignForm';

describe('CampaignForm', () => {
  it('renders the name input, description textarea, system select, and submit button', () => {
    render(<CampaignForm action={vi.fn()} />);
    expect(screen.getByPlaceholderText(/sunken city/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/brief overview/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create campaign/i })).toBeInTheDocument();
  });

  it('uses "Create Campaign" as default submit label', () => {
    render(<CampaignForm action={vi.fn()} />);
    expect(screen.getByRole('button', { name: /create campaign/i })).toBeInTheDocument();
  });

  it('uses custom submitLabel when provided', () => {
    render(<CampaignForm action={vi.fn()} submitLabel="Save Changes" />);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('hides status select when showStatus=false (default)', () => {
    render(<CampaignForm action={vi.fn()} />);
    // Only the system select should be present when showStatus=false
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });

  it('shows status select when showStatus=true', () => {
    render(<CampaignForm action={vi.fn()} showStatus={true} />);
    // Both system and status selects should be present
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
  });

  it('pre-fills name field from defaultValues', () => {
    render(<CampaignForm action={vi.fn()} defaultValues={{ name: 'Existing Campaign' }} />);
    expect(screen.getByPlaceholderText(/sunken city/i)).toHaveValue('Existing Campaign');
  });

  it('pre-fills system select from defaultValues', () => {
    render(<CampaignForm action={vi.fn()} defaultValues={{ system: 'Pathfinder 2e' }} />);
    expect(screen.getByRole('combobox')).toHaveValue('Pathfinder 2e');
  });

  it('shows error message returned from action', async () => {
    const action = vi.fn().mockResolvedValue({ error: 'Campaign name is required' });
    const user = userEvent.setup();
    render(<CampaignForm action={action} />);
    await user.type(screen.getByPlaceholderText(/sunken city/i), 'My Campaign');
    await user.click(screen.getByRole('button', { name: /create campaign/i }));
    expect(await screen.findByText('Campaign name is required')).toBeInTheDocument();
  });

  it('disables submit button while action is pending', async () => {
    let resolve: (v: unknown) => void;
    const action = vi.fn().mockReturnValue(new Promise((r) => { resolve = r; }));
    const user = userEvent.setup();
    render(<CampaignForm action={action} />);
    await user.type(screen.getByPlaceholderText(/sunken city/i), 'Test');
    await user.click(screen.getByRole('button', { name: /create campaign/i }));
    expect(screen.getByRole('button')).toBeDisabled();
    resolve!({});
  });

  it('shows "Saving…" text while pending', async () => {
    let resolve: (v: unknown) => void;
    const action = vi.fn().mockReturnValue(new Promise((r) => { resolve = r; }));
    const user = userEvent.setup();
    render(<CampaignForm action={action} />);
    await user.type(screen.getByPlaceholderText(/sunken city/i), 'Test Campaign');
    await user.click(screen.getByRole('button', { name: /create campaign/i }));
    expect(await screen.findByText(/saving/i)).toBeInTheDocument();
    resolve!({});
  });
});
