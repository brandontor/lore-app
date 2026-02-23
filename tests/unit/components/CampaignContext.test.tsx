import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignProvider, useCampaign } from '@/context/CampaignContext';
import { buildCampaignWithRole, CAMPAIGN_ID } from '../helpers/builders';
import type { CampaignWithRole } from '@/lib/types';

function TestConsumer() {
  const { activeCampaign, activeCampaignId, campaigns, setActiveCampaignId } = useCampaign();
  return (
    <div>
      <span data-testid="name">{activeCampaign?.name ?? 'none'}</span>
      <span data-testid="id">{activeCampaignId ?? 'null'}</span>
      <span data-testid="count">{campaigns.length}</span>
      <button onClick={() => setActiveCampaignId(CAMPAIGN_ID)}>Set</button>
      <button onClick={() => setActiveCampaignId(null)}>Clear</button>
    </div>
  );
}

function wrap(
  campaigns: CampaignWithRole[],
  initialActiveCampaignId: string | null = null
) {
  return render(
    <CampaignProvider campaigns={campaigns} initialActiveCampaignId={initialActiveCampaignId}>
      <TestConsumer />
    </CampaignProvider>
  );
}

describe('CampaignProvider', () => {
  it('derives activeCampaign from initialActiveCampaignId', () => {
    wrap([buildCampaignWithRole({ name: 'My Campaign' })], CAMPAIGN_ID);
    expect(screen.getByTestId('name')).toHaveTextContent('My Campaign');
  });

  it('returns null activeCampaign when initialActiveCampaignId is null', () => {
    wrap([buildCampaignWithRole()], null);
    expect(screen.getByTestId('name')).toHaveTextContent('none');
  });

  it('returns null activeCampaign when id does not match any campaign', () => {
    wrap([buildCampaignWithRole()], 'non-existent-id');
    expect(screen.getByTestId('name')).toHaveTextContent('none');
  });

  it('exposes all campaigns', () => {
    wrap([buildCampaignWithRole(), buildCampaignWithRole({ id: 'other-id' })]);
    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });

  it('updates activeCampaign when setActiveCampaignId is called', async () => {
    const user = userEvent.setup();
    wrap([buildCampaignWithRole({ name: 'Campaign A' })], null);
    expect(screen.getByTestId('name')).toHaveTextContent('none');
    await user.click(screen.getByRole('button', { name: 'Set' }));
    expect(screen.getByTestId('name')).toHaveTextContent('Campaign A');
  });

  it('writes cookie when setActiveCampaignId is called with an id', async () => {
    const user = userEvent.setup();
    const cookieSpy = vi.spyOn(document, 'cookie', 'set');
    wrap([buildCampaignWithRole()], null);
    await user.click(screen.getByRole('button', { name: 'Set' }));
    expect(cookieSpy).toHaveBeenCalledWith(expect.stringContaining(`active_campaign_id=${CAMPAIGN_ID}`));
    cookieSpy.mockRestore();
  });

  it('clears cookie (max-age=0) when setActiveCampaignId(null) is called', async () => {
    const user = userEvent.setup();
    const cookieSpy = vi.spyOn(document, 'cookie', 'set');
    wrap([buildCampaignWithRole()], CAMPAIGN_ID);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(cookieSpy).toHaveBeenCalledWith(expect.stringContaining('max-age=0'));
    cookieSpy.mockRestore();
  });

  it('sets activeCampaignId to null when cleared', async () => {
    const user = userEvent.setup();
    wrap([buildCampaignWithRole()], CAMPAIGN_ID);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByTestId('id')).toHaveTextContent('null');
  });
});

describe('useCampaign', () => {
  it('throws when used outside CampaignProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useCampaign must be used within CampaignProvider'
    );
    spy.mockRestore();
  });
});
