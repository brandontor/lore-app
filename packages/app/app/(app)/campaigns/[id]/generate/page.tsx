import { notFound } from 'next/navigation';
import { getCampaignById } from '@/lib/queries/campaigns';
import { getTranscriptsByCampaign, getAllScenesByTranscripts } from '@/lib/queries/transcripts';
import { getCharactersByCampaign } from '@/lib/queries/characters';
import { GenerateVideoWizard } from './GenerateVideoWizard';

export default async function GenerateVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const canWrite = campaign.userRole === 'owner' || campaign.userRole === 'write';
  if (!canWrite) notFound();

  const [transcripts, characters] = await Promise.all([
    getTranscriptsByCampaign(id),
    getCharactersByCampaign(id),
  ]);

  const allScenes = await getAllScenesByTranscripts(transcripts.map((t) => t.id));

  return (
    <GenerateVideoWizard
      campaignId={id}
      transcripts={transcripts}
      characters={characters}
      allScenes={allScenes}
    />
  );
}
