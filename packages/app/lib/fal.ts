import { fal } from '@fal-ai/client';
import OpenAI from 'openai';
import type { TranscriptScene, Character, VideoStyle } from '@lore/shared';

fal.config({ credentials: process.env.FAL_KEY });

// OpenAI client — hoisted to module scope so it is initialised once per cold start
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const CLIP_DURATION = '5' as const;

export const FAL_IMAGE_MODEL = 'fal-ai/flux/dev';
export const FAL_VIDEO_MODEL = 'fal-ai/kling-video/v1.6/standard/image-to-video';
export const NEGATIVE_PROMPT =
  'blurry, low quality, artifacts, watermark, text, logo, distorted faces, static, flickering, overexposed, underexposed';

/** Hostnames from which the server is allowed to fetch fal.ai video files. */
export const FAL_ALLOWED_HOSTNAMES = new Set([
  'v3.fal.media',
  'fal.media',
  'fal.run',
  'fal-cdn.fal.ai',
]);

export function isFalVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname;
    return (
      FAL_ALLOWED_HOSTNAMES.has(host) ||
      host.endsWith('.fal.media') ||
      host.endsWith('.fal.ai') ||
      host.endsWith('.fal.run')
    );
  } catch {
    return false;
  }
}

const STYLE_PREFIXES: Record<VideoStyle, string> = {
  cinematic: 'cinematic epic fantasy film,',
  anime: 'anime japanese animation style,',
  painterly: 'digital oil painting fantasy art,',
  'dark-fantasy': 'gritty dark fantasy atmospheric,',
};

interface FalVideoResult {
  video: { url: string };
}

interface FalImageResult {
  images: Array<{ url: string; content_type: string }>;
}

interface FalQueueStatus {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export async function buildVideoPrompt(
  scene: Pick<TranscriptScene, 'title' | 'description' | 'mood'>,
  style: VideoStyle,
  campaignName: string,
  characters: Pick<Character, 'name' | 'appearance' | 'race' | 'class'>[]
): Promise<{ imagePrompt: string; motionPrompt: string }> {
  if (!openai) throw new Error('OPENAI_API_KEY not configured');

  const characterDescriptions = characters
    .filter((c) => c.appearance)
    .map((c) => `${c.name}${c.race ? ` (${c.race}${c.class ? ` ${c.class}` : ''})` : ''}: ${c.appearance}`)
    .join('\n');

  const systemPrompt = `You are a video prompt engineer specialising in fantasy AI video generation for ${style} style.
Return a JSON object with exactly two fields:
- "imagePrompt": 50–70 words describing the static visual composition, setting, character appearances, and lighting — what FLUX should paint.
- "motionPrompt": 30–50 words describing camera movement, character actions, and how the scene animates — what Kling should follow.
Respond with only valid JSON. No markdown, no preamble.`;

  const userPrompt = `Campaign: "${campaignName}"
Scene: "${scene.title}"
Mood: ${scene.mood}
Description: ${scene.description}
${characterDescriptions ? `Characters:\n${characterDescriptions}` : ''}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 300,
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? '';
  if (!raw) throw new Error('OpenAI returned empty prompt');

  const parsed = JSON.parse(raw) as { imagePrompt?: string; motionPrompt?: string };
  if (!parsed.imagePrompt || !parsed.motionPrompt) {
    throw new Error('OpenAI returned malformed prompt JSON');
  }

  const prefix = STYLE_PREFIXES[style];
  return {
    imagePrompt: `${prefix} ${parsed.imagePrompt}`,
    motionPrompt: `${prefix} ${parsed.motionPrompt}`,
  };
}

export async function generateKeyframe(
  imagePrompt: string
): Promise<{ imageUrl: string }> {
  const result = await fal.subscribe(FAL_IMAGE_MODEL, {
    input: {
      prompt: imagePrompt,
      image_size: 'landscape_4_3',
      num_images: 1,
      guidance_scale: 3.5,
    },
  }) as { data: FalImageResult };

  const url = result.data?.images?.[0]?.url;
  if (!url) throw new Error('FLUX returned no image');
  return { imageUrl: url };
}

export async function submitImageToVideoFal(
  imageUrl: string,
  motionPrompt: string,
  webhookUrl?: string
): Promise<{ requestId: string }> {
  const handle = await fal.queue.submit(FAL_VIDEO_MODEL, {
    input: {
      image_url: imageUrl,
      prompt: motionPrompt,
      duration: CLIP_DURATION,
      aspect_ratio: '16:9',
      negative_prompt: NEGATIVE_PROMPT,
      cfg_scale: 0.5,
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    ...(webhookUrl ? { webhookUrl } : {}),
  });
  return { requestId: handle.request_id };
}

export async function getFalStatus(
  requestId: string,
  model: string
): Promise<{
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  videoUrl?: string;
}> {
  const statusResult = await fal.queue.status(model, {
    requestId,
    logs: false,
  }) as FalQueueStatus;

  if (statusResult.status === 'COMPLETED') {
    const result = await fal.queue.result(model, {
      requestId,
    }) as { data: FalVideoResult };
    return {
      status: 'COMPLETED',
      videoUrl: result.data?.video?.url,
    };
  }

  return { status: statusResult.status };
}
