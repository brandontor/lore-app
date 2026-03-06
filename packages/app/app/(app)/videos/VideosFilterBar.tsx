'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Filter } from 'lucide-react';

interface Props {
  campaigns: { id: string; name: string }[];
}

export function VideosFilterBar({ campaigns }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('campaign') ?? '';

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('campaign', value);
    } else {
      params.delete('campaign');
    }
    router.push(`/videos?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
      <Filter className="h-4 w-4 shrink-0" />
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-transparent outline-none cursor-pointer"
      >
        <option value="">All Campaigns</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
