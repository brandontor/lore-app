import { fal } from '@fal-ai/client';
import OpenAI from 'openai';
import type { TranscriptScene, Character, NPC, VideoStyle, CameraPreset } from '@lore/shared';

fal.config({ credentials: process.env.FAL_KEY });

// OpenAI client — hoisted to module scope so it is initialised once per cold start
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const DEFAULT_CLIP_DURATION = 5;
export const DEFAULT_MOTION_INTENSITY = 0.5;

export const FAL_IMAGE_MODEL = 'fal-ai/flux/dev';
export const FAL_VIDEO_MODEL = 'fal-ai/kling-video/v2.1/pro/image-to-video';

// Fantasy-targeted negative prompts, split by model
export const FLUX_NEGATIVE_PROMPT =
  'extra fingers, distorted face, extra limbs, anatomical errors, low resolution, blurry, plastic skin, flat lighting, oversaturated, watermark, text';
export const KLING_NEGATIVE_PROMPT =
  'blur, distort, low quality, watermark, text overlay, flickering, jitter, morphing faces, extra limbs, anatomical errors, overexposed, underexposed, static, grain artifacts';

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
  cinematic: 'Epic cinematic fantasy film, anamorphic lens, dramatic volumetric lighting, shallow depth of field,',
  anime: 'Japanese anime fantasy style, vibrant saturated colors, expressive dynamic poses, Studio Ghibli inspired,',
  painterly: 'Digital oil painting, rich impasto textures, warm candlelight palette, fantasy concept art,',
  'dark-fantasy': 'Gritty dark fantasy, desaturated moody palette, atmospheric fog, candlelit shadows,',
};

/** Human-readable label appended to motionPrompt when a named camera preset is chosen. */
export const CAMERA_PRESET_LABELS: Record<CameraPreset, string> = {
  'auto': '',
  'slow-dolly-in': 'Slow dolly in.',
  'tracking-shot': 'Tracking shot following the action.',
  'crane-up': 'Crane up to reveal scale.',
  'crash-zoom': 'Crash zoom for dramatic impact.',
  'low-angle-dolly': 'Low angle dolly for heroic framing.',
  'rack-focus-pan': 'Rack focus pan for mystery and environmental reveal.',
  'static-wide': 'Static wide shot, slow drift.',
};

/** Mood-to-camera vocabulary hint for the GPT system prompt. */
const MOOD_CAMERA_HINTS = `
Mood → suggested camera:
- tense: crash zoom or slow push in
- triumphant: crane up or low-angle dolly
- mysterious: slow pan with rack focus
- dramatic: slow dolly in or low-angle dolly
- comedic: static wide or gentle tracking shot
- melancholic: static wide with slow drift`;

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
  scene: Pick<TranscriptScene, 'title' | 'description' | 'mood' | 'raw_speaker_lines' | 'key_visuals' | 'characters_present'>,
  style: VideoStyle,
  campaignName: string,
  campaignSetting: string | null,
  characters: Pick<Character, 'name' | 'appearance' | 'race' | 'class'>[],
  npcs: Pick<NPC, 'name' | 'appearance' | 'description'>[],
  cameraPreset: CameraPreset = 'auto'
): Promise<{ imagePrompt: string; motionPrompt: string }> {
  if (!openai) throw new Error('OPENAI_API_KEY not configured');

  // Filter characters and NPCs to those present in this scene (if identified)
  const presentNames = new Set((scene.characters_present ?? []).map((n) => n.toLowerCase()));
  const filteredCharacters = presentNames.size > 0
    ? characters.filter((c) => presentNames.has(c.name.toLowerCase()))
    : characters;
  const filteredNpcs = presentNames.size > 0
    ? npcs.filter((n) => presentNames.has(n.name.toLowerCase()))
    : npcs;

  const characterDescriptions = filteredCharacters
    .filter((c) => c.appearance)
    .map((c) => `${c.name}${c.race ? ` (${c.race}${c.class ? ` ${c.class}` : ''})` : ''}: ${c.appearance}`)
    .join('\n');

  const npcDescriptions = filteredNpcs
    .filter((n) => n.appearance || n.description)
    .map((n) => `${n.name}: ${[n.appearance, n.description].filter(Boolean).join(' — ')}`)
    .join('\n');

  const keyDialogue = (scene.raw_speaker_lines ?? []).slice(0, 5).join('\n');
  const keyVisuals = (scene.key_visuals ?? []).join(', ');

  const cameraInstruction = cameraPreset !== 'auto'
    ? `The user has selected this camera move — you MUST use it in the motionPrompt: "${CAMERA_PRESET_LABELS[cameraPreset]}"`
    : `Choose camera movement based on mood:${MOOD_CAMERA_HINTS}`;

  const systemPrompt = `You are a video prompt engineer specialising in fantasy AI video generation for ${style} style.
Return a JSON object with exactly two fields:
- "imagePrompt": 80–100 words using the 4-part formula: [Scene Setting] + [Subject Action] + [Camera/Composition] + [Stylistic Keywords]. You MUST reference at least one specific visual element from key_visuals if provided. Describe environment, atmosphere, lighting, and character appearances — prefer body language and silhouettes over facial close-ups. Include specific lighting conditions. Do NOT write generic fantasy tropes.
- "motionPrompt": 50–70 words using the 4-part formula: [Camera Movement] + [Subject Motion] + [Environmental Motion] + [Pacing/Mood]. ${cameraInstruction}
Respond with only valid JSON. No markdown, no preamble.`;

  const contextSections = [
    `Campaign: "${campaignName}"`,
    campaignSetting ? `World/Setting: ${campaignSetting}` : null,
    `Scene: "${scene.title}"`,
    `Mood: ${scene.mood}`,
    `Description: ${scene.description}`,
    keyVisuals ? `Key visuals (must appear): ${keyVisuals}` : null,
    characterDescriptions ? `Characters:\n${characterDescriptions}` : null,
    npcDescriptions ? `NPCs:\n${npcDescriptions}` : null,
    keyDialogue ? `Key dialogue:\n${keyDialogue}` : null,
  ].filter(Boolean);

  const userPrompt = contextSections.join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 400,
    temperature: 0.4,
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

/**
 * Generates a keyframe image via FLUX dev.
 *
 * Uses fal.queue.submit (non-blocking) + explicit polling so we have a hard
 * timeout. FLUX dev typically completes in 5–15s. The total allowed time is
 * 40s — this requires Vercel Pro (60s limit) or a long-running runtime;
 * Vercel Hobby (10s) will not support this.
 */
export async function generateKeyframe(
  imagePrompt: string
): Promise<{ imageUrl: string }> {
  const TIMEOUT_MS = 40_000;
  const POLL_INTERVAL_MS = 2_000;

  // Submit to queue immediately (returns requestId, does not block)
  const handle = await fal.queue.submit(FAL_IMAGE_MODEL, {
    input: {
      prompt: imagePrompt,
      image_size: 'landscape_16_9',
      num_images: 1,
      guidance_scale: 7.0,
      num_inference_steps: 35,
      // output_format and negative_prompt are valid FLUX dev params but not yet
      // reflected in the fal SDK's TypeScript types for this endpoint.
      output_format: 'jpeg', // forces JPEG — keeps extension/MIME consistent
      negative_prompt: FLUX_NEGATIVE_PROMPT,
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  const requestId = handle.request_id;
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    const status = await fal.queue.status(FAL_IMAGE_MODEL, {
      requestId,
      logs: false,
    }) as FalQueueStatus;

    if (status.status === 'COMPLETED') {
      const result = await fal.queue.result(FAL_IMAGE_MODEL, {
        requestId,
      }) as { data: FalImageResult };
      const url = result.data?.images?.[0]?.url;
      if (!url) throw new Error('FLUX returned no image URL');
      return { imageUrl: url };
    }

    if (status.status === 'FAILED') {
      throw new Error('FLUX keyframe generation failed');
    }

    // IN_QUEUE or IN_PROGRESS — wait before next poll
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`FLUX keyframe timed out after ${TIMEOUT_MS / 1000}s`);
}

export async function submitImageToVideoFal(
  imageUrl: string,
  motionPrompt: string,
  options?: {
    webhookUrl?: string;
    cfgScale?: number;
    duration?: number;
  }
): Promise<{ requestId: string }> {
  const { webhookUrl, cfgScale = DEFAULT_MOTION_INTENSITY, duration = DEFAULT_CLIP_DURATION } = options ?? {};
  // Whitelist duration to the two values Kling accepts; reject anything else explicitly
  const durationStr: '5' | '10' = duration === 10 ? '10' : '5';
  const handle = await fal.queue.submit(FAL_VIDEO_MODEL, {
    input: {
      image_url: imageUrl,
      prompt: motionPrompt,
      duration: durationStr,
      aspect_ratio: '16:9',
      // negative_prompt is supported by Kling v2.1 pro on fal.ai per their input schema
      negative_prompt: KLING_NEGATIVE_PROMPT,
      // cfg_scale controls prompt adherence (0–1). Not yet in the fal SDK's
      // TypeScript types for this endpoint, so cast to any.
      cfg_scale: cfgScale,
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    ...(webhookUrl ? { webhookUrl } : {}),
  });
  return { requestId: handle.request_id };
}

export async function getFalStatus(
  requestId: string,
  // Pass the exact model path that was used to submit the job.
  // Stored on the video row (fal_model) so we can poll the correct queue
  // even after a deployment changes the default model.
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
