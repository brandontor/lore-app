'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Wand2, Edit, ScrollText, Video, User, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { DiscordConnectButton } from './DiscordConnectButton';
import type { CampaignWithRole, Transcript, Character, Video as VideoType, CampaignMember } from '@lore/shared';
import type { DiscordChannelConfig } from '@/lib/queries/discordChannels';

const baseTabs = ['Overview', 'Transcripts', 'Characters', 'Videos'] as const;
type Tab = (typeof baseTabs)[number] | 'Members';

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'default'> = {
  active: 'success',
  paused: 'warning',
  completed: 'default',
  archived: 'default',
};

const TRANSCRIPT_STATUS_BADGE: Record<string, 'success' | 'warning' | 'default' | 'danger'> = {
  processed: 'success',
  processing: 'warning',
  pending: 'default',
  error: 'danger',
};

interface Props {
  campaign: CampaignWithRole;
  transcripts: Transcript[];
  characters: Character[];
  videos: VideoType[];
  members: CampaignMember[];
  discordChannels: DiscordChannelConfig[];
}

export function CampaignDetailTabs({ campaign, transcripts, characters, videos, members, discordChannels }: Props) {
  const isOwner = campaign.userRole === 'owner';
  const canWrite = isOwner || campaign.userRole === 'write';

  const tabs: Tab[] = isOwner
    ? [...baseTabs, 'Members']
    : [...baseTabs];

  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{campaign.name}</h1>
            <Badge variant={STATUS_BADGE[campaign.status] ?? 'default'}>{campaign.status}</Badge>
          </div>
          <p className="text-sm text-zinc-500">
            {campaign.system}
            {campaign.setting ? ` · ${campaign.setting}` : ''}
            {` · ${transcripts.length} transcripts · ${videos.length} videos`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Link href={`/campaigns/${campaign.id}/edit`}>
              <Button variant="secondary">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
          {canWrite && (
            <Link href={`/campaigns/${campaign.id}/generate`}>
              <Button>
                <Wand2 className="h-4 w-4" />
                Generate Video
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview */}
      {activeTab === 'Overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {campaign.description ?? (
                    <span className="italic text-zinc-400">No description added yet.</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Stats</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Transcripts', value: transcripts.length },
                  { label: 'Characters', value: characters.length },
                  { label: 'Videos', value: videos.length },
                  { label: 'Members', value: members.length + 1 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-zinc-500">{label}</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'System', value: campaign.system },
                  { label: 'Setting', value: campaign.setting ?? '—' },
                  { label: 'Your role', value: campaign.userRole },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-zinc-500">{label}</span>
                    <span className="font-medium capitalize text-zinc-900 dark:text-zinc-100">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Discord Bot</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {discordChannels.length === 0 ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Not connected
                    </div>
                    <p className="text-xs text-zinc-500">
                      Connect the bot to record voice sessions directly from Discord.
                    </p>
                    <DiscordConnectButton campaignId={campaign.id} hasChannels={false} />
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {discordChannels.length} channel{discordChannels.length > 1 ? 's' : ''} linked
                    </div>
                    <DiscordConnectButton campaignId={campaign.id} hasChannels={true} />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Transcripts */}
      {activeTab === 'Transcripts' && (
        <div className="space-y-4">
          {canWrite && (
            <div className="flex justify-end">
              <Link href={`/campaigns/${campaign.id}/transcripts/new`}>
                <Button>
                  <ScrollText className="h-4 w-4" />
                  New Transcript
                </Button>
              </Link>
            </div>
          )}
          {transcripts.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No transcripts yet"
              description="Upload a session transcript to get started."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-zinc-100 dark:border-zinc-800">
                    <tr className="text-left text-xs font-medium text-zinc-500">
                      <th className="px-6 py-3">Session</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Duration</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {transcripts.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                          {t.title}
                        </td>
                        <td className="px-6 py-4 text-zinc-500">
                          {t.session_date ? new Date(t.session_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4 text-zinc-500">
                          {t.duration_minutes ? `${t.duration_minutes}m` : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={TRANSCRIPT_STATUS_BADGE[t.status] ?? 'default'}>
                            {t.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/transcripts/${t.id}`}
                            className="text-violet-600 hover:underline dark:text-violet-400"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Characters */}
      {activeTab === 'Characters' && (
        <div>
          {characters.length === 0 ? (
            <EmptyState
              icon={User}
              title="No characters yet"
              description="Characters will appear here once added."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {characters.map((char) => (
                <Card key={char.id}>
                  <CardContent>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <User className="h-5 w-5 text-zinc-500" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{char.name}</h3>
                    <p className="text-sm text-zinc-500">
                      Level {char.level}
                      {char.race ? ` ${char.race}` : ''}
                      {char.class ? ` ${char.class}` : ''}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Videos */}
      {activeTab === 'Videos' && (
        <div className="space-y-4">
          {canWrite && (
            <div className="flex justify-end">
              <Link href={`/campaigns/${campaign.id}/generate`}>
                <Button>
                  <Wand2 className="h-4 w-4" />
                  Generate New Video
                </Button>
              </Link>
            </div>
          )}
          {videos.length === 0 ? (
            <EmptyState
              icon={Video}
              title="No videos yet"
              description="Generate a video from your session transcripts."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {videos.map((video) => (
                <Card key={video.id}>
                  <CardContent>
                    <div className="mb-4 flex h-40 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <Video className="h-10 w-10 text-zinc-400" />
                    </div>
                    <h3 className="mb-1 font-medium text-zinc-900 dark:text-zinc-100">{video.title}</h3>
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <Badge variant="default">{video.style}</Badge>
                      <Badge variant={video.status === 'completed' ? 'success' : 'warning'}>
                        {video.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members (owner only) */}
      {activeTab === 'Members' && isOwner && (
        <div className="text-center">
          <p className="mb-4 text-sm text-zinc-500">
            Manage who has access to this campaign.
          </p>
          <Link href={`/campaigns/${campaign.id}/members`}>
            <Button>
              <Users className="h-4 w-4" />
              Manage Members
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
