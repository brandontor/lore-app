import { notFound } from 'next/navigation';
import { getCampaignById, getCampaignMembers } from '@/lib/queries/campaigns';
import { getTranscriptsByCampaign } from '@/lib/queries/transcripts';
import { getCharactersByCampaign } from '@/lib/queries/characters';
import { getVideosByCampaign } from '@/lib/queries/videos';
import { CampaignDetailTabs } from './CampaignDetailTabs';

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const campaign = await getCampaignById(id);

  if (!campaign) notFound();

  const [transcripts, characters, videos, members] = await Promise.all([
    getTranscriptsByCampaign(id),
    getCharactersByCampaign(id),
    getVideosByCampaign(id),
    campaign.userRole === 'owner' ? getCampaignMembers(id) : Promise.resolve([]),
  ]);

  return (
    <CampaignDetailTabs
      campaign={campaign}
      transcripts={transcripts}
      characters={characters}
      videos={videos}
      members={members}
    />
  );
}
