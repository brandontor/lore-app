import { fal } from '@fal-ai/client';
import OpenAI from 'openai';
import type { TranscriptScene, Character, VideoStyle } from '@lore/shared';

fal.config({ credentials: process.env.FAL_KEY });

// OpenAI client — hoisted to module scope so it is initialised once per cold start
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const CLIP_DURATION = '5' as const;

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

interface FalQueueStatus {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export async function buildVideoPrompt(
  scene: Pick<TranscriptScene, 'title' | 'description' | 'mood'>,
  style: VideoStyle,
  campaignName: string,
  characters: Pick<Character, 'name' | 'appearance' | 'race' | 'class'>[]
): Promise<string> {
  if (!openai) throw new Error('OPENAI_API_KEY not configured');

  const characterDescriptions = characters
    .filter((c) => c.appearance)
    .map((c) => `${c.name}${c.race ? ` (${c.race}${c.class ? ` ${c.class}` : ''})` : ''}: ${c.appearance}`)
    .join('\n');

  const systemPrompt = `You are a video prompt engineer specialising in fantasy AI video generation for ${style} style.
Create a concise, vivid video generation prompt (60–90 words) optimised for Kling video AI.
Focus on: visual composition, lighting, action, atmosphere. Avoid: dialogue, internal monologue, meta references.`;

  const userPrompt = `Campaign: "${campaignName}"
Scene: "${scene.title}"
Mood: ${scene.mood}
Description: ${scene.description}
${characterDescriptions ? `Characters:\n${characterDescriptions}` : ''}

Write a single video prompt paragraph. No preamble.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 200,
    temperature: 0.6,
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? '';
  if (!raw) throw new Error('OpenAI returned empty prompt');

  return `${STYLE_PREFIXES[style]} ${raw}`;
}

export async function submitToFal(
  prompt: string,
  webhookUrl?: string
): Promise<{ requestId: string }> {
  const handle = await fal.queue.submit('fal-ai/kling-video/v1.6/standard/text-to-video', {
    input: {
      prompt,
      duration: CLIP_DURATION,
      aspect_ratio: '16:9',
    },
    ...(webhookUrl ? { webhookUrl } : {}),
  });
  return { requestId: handle.request_id };
}

export async function getFalStatus(requestId: string): Promise<{
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  videoUrl?: string;
}> {
  const statusResult = await fal.queue.status('fal-ai/kling-video/v1.6/standard/text-to-video', {
    requestId,
    logs: false,
  }) as FalQueueStatus;

  if (statusResult.status === 'COMPLETED') {
    const result = await fal.queue.result('fal-ai/kling-video/v1.6/standard/text-to-video', {
      requestId,
    }) as { data: FalVideoResult };
    return {
      status: 'COMPLETED',
      videoUrl: result.data?.video?.url,
    };
  }

  return { status: statusResult.status };
}
