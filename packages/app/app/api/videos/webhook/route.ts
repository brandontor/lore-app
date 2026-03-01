import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { processCompletedFalVideo } from '@/lib/video-processing';

interface FalWebhookPayload {
  status: 'OK' | 'ERROR';
  payload?: { video?: { url: string } };
  request_id: string;
  error?: string;
}

export async function POST(req: Request) {
  // Authenticate via secret query param embedded in the webhook URL
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: FalWebhookPayload;
  try {
    body = (await req.json()) as FalWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { request_id, status, payload } = body;

  const adminClient = createAdminClient();

  const { data: video } = await adminClient
    .from('videos')
    .select('id, campaign_id, status')
    .eq('fal_request_id', request_id)
    .single();

  if (!video) {
    // Unknown request ID — return 200 so fal.ai doesn't retry
    return NextResponse.json({ ok: true });
  }

  // Already settled — nothing to do
  if (video.status === 'completed' || video.status === 'error') {
    return NextResponse.json({ ok: true });
  }

  if (status === 'ERROR') {
    await adminClient
      .from('videos')
      .update({ status: 'error' })
      .eq('id', video.id)
      .neq('status', 'error');
    return NextResponse.json({ ok: true });
  }

  if (status === 'OK') {
    const videoUrl = payload?.video?.url;
    if (videoUrl) {
      await processCompletedFalVideo(video.id, video.campaign_id, videoUrl);
    } else {
      // Completed but no URL — mark error so the UI stops showing a spinner
      await adminClient
        .from('videos')
        .update({ status: 'error' })
        .eq('id', video.id)
        .neq('status', 'error');
    }
  }

  // Always return 200 — fal.ai retries on non-2xx
  return NextResponse.json({ ok: true });
}
