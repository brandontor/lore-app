'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Wand2, Edit, ScrollText, Video, Users, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { DiscordConnectButton } from './DiscordConnectButton';
import { CharactersTab } from '@/components/campaigns/CharactersTab';
import { NpcsTab } from '@/components/campaigns/NpcsTab';
import { LocationsTab } from '@/components/campaigns/LocationsTab';
import type { CampaignWithRole, Transcript, Character, NPC, Location, CampaignMember } from '@lore/shared';
import type { DiscordChannelConfig } from '@/lib/queries/discordChannels';
import type { VideoWithSession } from '@/lib/queries/videos';
import type { TranscriptWithSceneCount } from '@/lib/queries/transcripts';
import { groupVideosBySession } from '@/lib/queries/videos';
import { formatStyle } from '@/lib/video-utils';

const baseTabs = ['Overview', 'Transcripts', 'Characters', 'NPCs', 'Locations', 'Videos'] as const;

function isSafeStorageUrl(url: string): boolean {
  if (!url) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

function videoStatusBadgeVariant(status: string): 'default' | 'warning' | 'danger' {
  if (status === 'error') return 'danger';
  if (status === 'processing') return 'warning';
  return 'default';
}
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
  npcs: NPC[];
  locations: Location[];
  videos: VideoWithSession[];
  members: CampaignMember[];
  discordChannels: DiscordChannelConfig[];
  recentSummaries: TranscriptWithSceneCount[];
}

export function CampaignDetailTabs({
  campaign,
  transcripts,
  characters,
  npcs,
  locations,
  videos,
  members,
  discordChannels,
  recentSummaries,
}: Props) {
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

            {/* Recent Session Summaries */}
            <Card>
              <CardHeader><CardTitle>Recent Session Summaries</CardTitle></CardHeader>
              <CardContent>
                {recentSummaries.length === 0 ? (
                  <p className="text-sm italic text-zinc-400">
                    No session summaries yet. Generate one from any transcript.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentSummaries.map((t) => (
                      <div key={t.id} className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0 dark:border-zinc-800">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block truncate font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                              {t.session_number ? `Session ${t.session_number} — ` : ''}{t.title}
                            </span>
                            {t.scene_count > 0 && (
                              <span className="text-xs text-zinc-400">
                                {t.scene_count} {t.scene_count === 1 ? 'scene' : 'scenes'} extracted
                              </span>
                            )}
                          </div>
                          {t.session_date && (
                            <span className="shrink-0 text-xs text-zinc-400">
                              {new Date(t.session_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 line-clamp-3 text-xs text-zinc-500">{t.summary}</p>
                        <Link
                          href={`/transcripts/${t.id}`}
                          className="mt-1 inline-block text-xs text-violet-600 hover:underline dark:text-violet-400"
                        >
                          Read full summary →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
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
                  { label: 'NPCs', value: npcs.length },
                  { label: 'Locations', value: locations.length },
                  { label: 'Videos', value: videos.length },
                  ...(isOwner ? [{ label: 'Members', value: members.length + 1 }] : []),
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
                      {discordChannels.length} channel{discordChannels.length !== 1 ? 's' : ''} linked
                    </div>
                    <ul className="space-y-1.5">
                      {discordChannels.map((ch) => (
                        <li key={ch.channel_id} className="flex flex-col text-xs">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            #{ch.channel_name ?? `${ch.channel_id.slice(0, 8)}…`}
                          </span>
                          <span className="text-zinc-500">
                            {ch.guild_name ?? 'Unknown server'}
                            {' · '}
                            {new Date(ch.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </li>
                      ))}
                    </ul>
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
        <CharactersTab
          campaignId={campaign.id}
          characters={characters}
          canWrite={canWrite}
        />
      )}

      {/* NPCs */}
      {activeTab === 'NPCs' && (
        <NpcsTab
          campaignId={campaign.id}
          npcs={npcs}
          canWrite={canWrite}
        />
      )}

      {/* Locations */}
      {activeTab === 'Locations' && (
        <LocationsTab
          campaignId={campaign.id}
          locations={locations}
          canWrite={canWrite}
        />
      )}

      {/* Videos */}
      {activeTab === 'Videos' && (() => {
        const { sessions, ungrouped } = groupVideosBySession(videos);
        return (
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
              <div className="space-y-8">
                {sessions.map((session) => {
                  const sessionLabel = session.session_number ? `Session ${session.session_number}` : null;
                  return (
                    <section key={session.transcript_id}>
                      <div className="mb-3 flex items-center gap-2">
                        <ScrollText className="h-4 w-4 shrink-0 text-zinc-400" />
                        <h3 className="flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {sessionLabel ? `${sessionLabel} — ` : ''}{session.transcript_title}
                        </h3>
                        <span className="shrink-0 text-xs text-zinc-400">
                          {session.videos.length} {session.videos.length === 1 ? 'clip' : 'clips'}
                        </span>
                        {session.videos.filter((v) => v.status === 'completed').length >= 2 && (
                          <Link
                            href={`/videos/reel/${session.transcript_id}`}
                            className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950/60"
                          >
                            <Play className="h-3 w-3" />
                            Watch Reel
                          </Link>
                        )}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {session.videos.map((video) => {
                          const isCompleted = video.status === 'completed';
                          const hasKeyframe = !!video.image_url && isSafeStorageUrl(video.image_url);
                          return (
                            <Card key={video.id} className="group overflow-hidden">
                              <CardContent className="p-0">
                                <Link href={`/videos/${video.id}`}>
                                  <div className="relative flex h-40 items-center justify-center overflow-hidden bg-zinc-100 transition-colors group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700">
                                    {hasKeyframe ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={video.image_url!} alt={video.title} className="h-full w-full object-cover" />
                                    ) : (
                                      <Video className="h-10 w-10 text-zinc-400" />
                                    )}
                                    {!isCompleted && (
                                      <span className="absolute bottom-2 right-2">
                                        <Badge variant={videoStatusBadgeVariant(video.status)}>
                                          {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                                        </Badge>
                                      </span>
                                    )}
                                  </div>
                                </Link>
                                <div className="p-4">
                                  <Link href={`/videos/${video.id}`} className="font-medium text-zinc-900 hover:text-violet-600 dark:text-zinc-100 dark:hover:text-violet-400">
                                    {video.title}
                                  </Link>
                                  <div className="mt-2 flex items-center justify-between">
                                    <Badge variant="outline">{formatStyle(video.style)}</Badge>
                                    {isCompleted && <Badge variant="success">Completed</Badge>}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
                {ungrouped.length > 0 && (
                  <section>
                    {sessions.length > 0 && (
                      <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Other clips
                      </h3>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {ungrouped.map((video) => {
                        const isCompleted = video.status === 'completed';
                        const hasKeyframe = !!video.image_url && isSafeStorageUrl(video.image_url);
                        return (
                          <Card key={video.id} className="group overflow-hidden">
                            <CardContent className="p-0">
                              <Link href={`/videos/${video.id}`}>
                                <div className="relative flex h-40 items-center justify-center overflow-hidden bg-zinc-100 transition-colors group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700">
                                  {hasKeyframe ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={video.image_url!} alt={video.title} className="h-full w-full object-cover" />
                                  ) : (
                                    <Video className="h-10 w-10 text-zinc-400" />
                                  )}
                                  {!isCompleted && (
                                    <span className="absolute bottom-2 right-2">
                                      <Badge variant={videoStatusBadgeVariant(video.status)}>
                                        {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                                      </Badge>
                                    </span>
                                  )}
                                </div>
                              </Link>
                              <div className="p-4">
                                <Link href={`/videos/${video.id}`} className="font-medium text-zinc-900 hover:text-violet-600 dark:text-zinc-100 dark:hover:text-violet-400">
                                  {video.title}
                                </Link>
                                <div className="mt-2 flex items-center justify-between">
                                  <Badge variant="outline">{formatStyle(video.style)}</Badge>
                                  {isCompleted && <Badge variant="success">Completed</Badge>}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        );
      })()}

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
