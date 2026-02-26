'use client';

import { useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { upsertSpeakerMapping } from '@/lib/actions/transcripts';
import type { Character, SpeakerCharacterMapping, Transcript } from '@lore/shared';

interface Props {
  transcript: Transcript;
  characters: Character[];
  initialMappings: SpeakerCharacterMapping[];
  canWrite: boolean;
  campaignId: string;
}

function parseSpeakers(content: string): string[] {
  const regex = /^\[[\d:]+\] ([^:]+):/gm;
  const speakers = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    speakers.add(match[1].trim());
  }
  return Array.from(speakers).sort();
}

export function SpeakerMappingPanel({ transcript, characters, initialMappings, canWrite, campaignId }: Props) {
  const speakers = parseSpeakers(transcript.content);
  const [isPending, startTransition] = useTransition();

  if (speakers.length === 0) return null;

  const mappingByName: Record<string, string | null> = {};
  for (const m of initialMappings) {
    mappingByName[m.speaker_name] = m.character_id;
  }

  function handleChange(speakerName: string, characterId: string) {
    startTransition(async () => {
      await upsertSpeakerMapping(campaignId, speakerName, characterId || null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Speaker Mappings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-xs text-zinc-500">
          Map Discord usernames to campaign characters for richer video context.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800">
              <th className="pb-2 pr-4">Speaker</th>
              <th className="pb-2">Character</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {speakers.map((speaker) => (
              <tr key={speaker}>
                <td className="py-2.5 pr-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {speaker}
                </td>
                <td className="py-2.5">
                  {canWrite ? (
                    <select
                      defaultValue={mappingByName[speaker] ?? ''}
                      disabled={isPending}
                      onChange={(e) => handleChange(speaker, e.target.value)}
                      className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    >
                      <option value="">— Unassigned —</option>
                      {characters.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-zinc-500">
                      {characters.find((c) => c.id === mappingByName[speaker])?.name ?? '— Unassigned —'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
