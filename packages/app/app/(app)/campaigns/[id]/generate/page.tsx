import { notFound } from 'next/navigation';
import { getCampaignById } from '@/lib/queries/campaigns';
import { getTranscriptsByCampaign } from '@/lib/queries/transcripts';
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

  const transcripts = await getTranscriptsByCampaign(id);

  return <GenerateVideoWizard campaignId={id} transcripts={transcripts} />;
}
