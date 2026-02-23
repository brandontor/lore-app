import { render, type RenderOptions } from '@testing-library/react';
import { CampaignProvider } from '@/context/CampaignContext';
import { buildCampaignWithRole, CAMPAIGN_ID } from './builders';
import type { CampaignWithRole } from '@/lib/types';
import type { ReactElement, ReactNode } from 'react';

interface WrapperOptions {
  campaigns?: CampaignWithRole[];
  initialActiveCampaignId?: string | null;
}

export function renderWithCampaignContext(
  ui: ReactElement,
  {
    campaigns = [buildCampaignWithRole()],
    initialActiveCampaignId = CAMPAIGN_ID,
    ...renderOptions
  }: WrapperOptions & RenderOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <CampaignProvider
        campaigns={campaigns}
        initialActiveCampaignId={initialActiveCampaignId}
      >
        {children}
      </CampaignProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
