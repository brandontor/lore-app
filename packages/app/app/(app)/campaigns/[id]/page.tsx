import { notFound } from 'next/navigation';
import { getCampaignById, getCampaignMembers } from '@/lib/queries/campaigns';
import { getTranscriptsByCampaign, getRecentTranscriptsWithSummaries } from '@/lib/queries/transcripts';
import { getCharactersByCampaign } from '@/lib/queries/characters';
import { getNpcsByCampaign } from '@/lib/queries/npcs';
import { getLocationsByCampaign } from '@/lib/queries/locations';
import { getVideosByCampaignWithSession } from '@/lib/queries/videos';
import { getDiscordChannelsByCampaign } from '@/lib/queries/discordChannels';
import { CampaignDetailTabs } from './CampaignDetailTabs';

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const campaign = await getCampaignById(id);

  if (!campaign) notFound();

  const [transcripts, characters, npcs, locations, videos, members, discordChannels, recentSummaries] =
    await Promise.all([
      getTranscriptsByCampaign(id),
      getCharactersByCampaign(id),
      getNpcsByCampaign(id),
      getLocationsByCampaign(id),
      getVideosByCampaignWithSession(id),
      campaign.userRole === 'owner' ? getCampaignMembers(id) : Promise.resolve([]),
      getDiscordChannelsByCampaign(id),
      getRecentTranscriptsWithSummaries(id, 3),
    ]);

  return (
    <CampaignDetailTabs
      campaign={campaign}
      transcripts={transcripts}
      characters={characters}
      npcs={npcs}
      locations={locations}
      videos={videos}
      members={members}
      discordChannels={discordChannels}
      recentSummaries={recentSummaries}
    />
  );
}
