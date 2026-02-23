import { GenerateVideoWizard } from './GenerateVideoWizard';

export default async function GenerateVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GenerateVideoWizard campaignId={id} />;
}
