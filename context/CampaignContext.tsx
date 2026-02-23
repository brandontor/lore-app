'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { CampaignWithRole } from '@/lib/types';

interface CampaignContextValue {
  campaigns: CampaignWithRole[];
  activeCampaignId: string | null;
  setActiveCampaignId: (id: string | null) => void;
  activeCampaign: CampaignWithRole | null;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({
  children,
  campaigns,
  initialActiveCampaignId,
}: {
  children: ReactNode;
  campaigns: CampaignWithRole[];
  initialActiveCampaignId: string | null;
}) {
  const [activeCampaignId, setActiveCampaignIdState] = useState<string | null>(
    initialActiveCampaignId
  );

  const setActiveCampaignId = useCallback((id: string | null) => {
    setActiveCampaignIdState(id);
    if (id) {
      document.cookie = `active_campaign_id=${id};path=/;max-age=${60 * 60 * 24 * 30}`;
    } else {
      document.cookie = 'active_campaign_id=;path=/;max-age=0';
    }
  }, []);

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId) ?? null;

  return (
    <CampaignContext.Provider
      value={{ campaigns, activeCampaignId, setActiveCampaignId, activeCampaign }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error('useCampaign must be used within CampaignProvider');
  return ctx;
}
