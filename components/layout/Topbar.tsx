'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LogOut, User, ChevronDown, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCampaign } from '@/context/CampaignContext';
import type { CampaignWithRole } from '@/lib/types';

interface TopbarProps {
  displayName: string;
  campaigns: CampaignWithRole[];
}

export function Topbar({ displayName }: TopbarProps) {
  const router = useRouter();
  const { campaigns, activeCampaign, setActiveCampaignId } = useCampaign();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Campaign selector */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <span>{activeCampaign?.name ?? 'Select Campaign'}</span>
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {campaigns.length === 0 ? (
              <p className="px-4 py-3 text-sm text-zinc-500">No campaigns yet</p>
            ) : (
              campaigns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveCampaignId(c.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {c.name}
                  </span>
                  <div className="ml-2 flex shrink-0 items-center gap-2">
                    <span className="text-xs text-zinc-400">{c.userRole}</span>
                    {c.id === activeCampaign?.id && (
                      <Check className="h-3.5 w-3.5 text-violet-500" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* User + sign out */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900">
            <User className="h-4 w-4 text-violet-700 dark:text-violet-300" />
          </div>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {displayName}
          </span>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>
  );
}
