import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted runs before ESM imports and vi.mock factories, so:
// 1. OPENAI_API_KEY is set before fal.ts initialises its module-scope `openai` constant.
// 2. mockCreate is declared here so the vi.mock('openai') factory can reference it.
const { mockCreate } = vi.hoisted(() => {
  process.env.OPENAI_API_KEY = 'test-key';
  return { mockCreate: vi.fn() };
});

import { buildVideoPrompt } from '@/lib/fal';

// Mock the fal client (not exercised in buildVideoPrompt)
vi.mock('@fal-ai/client', () => ({
  fal: { config: vi.fn(), queue: {} },
}));

// Mock OpenAI — capture the messages passed to it
vi.mock('openai', () => ({
  default: vi.fn(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

const baseScene = {
  title: 'Dragon Awakens',
  description: 'A massive dragon erupts from its lair beneath the mountain.',
  mood: 'dramatic' as const,
  raw_speaker_lines: [
    'Aria: Run!',
    'DM: The ground shakes as the dragon rises.',
    'Theron: We have to hold the line.',
  ],
  key_visuals: [],
  characters_present: [],
};

const baseChars = [
  { name: 'Aria', appearance: 'Elven ranger in green leather armour', race: 'Elf', class: 'Ranger' },
];

const baseNpcs = [
  { name: 'Lord Malachar', appearance: 'Gaunt robed figure with hollow eyes', description: 'The lich who woke the dragon' },
];

function mockOpenAIResponse(imagePrompt: string, motionPrompt: string) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ imagePrompt, motionPrompt }) } }],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildVideoPrompt', () => {
  it('includes campaign name in the user prompt', async () => {
    mockOpenAIResponse('a great image', 'smooth pan');
    await buildVideoPrompt(baseScene, 'cinematic', 'Curse of Strahd', null, [], []);
    const userMsg = mockCreate.mock.calls[0][0].messages[1].content as string;
    expect(userMsg).toContain('Curse of Strahd');
  });

  it('includes campaignSetting when provided', async () => {
    mockOpenAIResponse('a great image', 'smooth pan');
    await buildVideoPrompt(baseScene, 'cinematic', 'My Campaign', 'A Gothic horror realm of eternal twilight', [], []);
    const userMsg = mockCreate.mock.calls[0][0].messages[1].content as string;
    expect(userMsg).toContain('World/Setting: A Gothic horror realm of eternal twilight');
  });

  it('omits World/Setting line when campaignSetting is null', async () => {
    mockOpenAIResponse('a great image', 'smooth pan');
    await buildVideoPrompt(baseScene, 'cinematic', 'My Campaign', null, [], []);
    const userMsg = mockCreate.mock.calls[0][0].messages[1].content as string;
    expect(userMsg).not.toContain('World/Setting');
  });

  it('includes character appearances in the user prompt', async () => {
    mockOpenAIResponse('a great image', 'smooth pan');
    await buildVideoPrompt(baseScene, 'cinematic', 'My Campaign', null, baseChars, []);
    const userMsg = mockCreate.mock.calls[0][0].messages[1].content as string;
    expect(userMsg).toContain('Aria');
    expect(userMsg).toContain('Elven ranger in green leather armour');
  });

  it('includes NPC appearances in the user prompt', async () => {
    mockOpenAIResponse('a great image', 'smooth pan');
    await buildVideoPrompt(baseScene, 'cinematic', 'My Campaign', null, [], baseNpcs);
    const userMsg = mockCreate.mock.calls[0][0].messages[1].content as string;
    expect(userMsg).toContain('Lord Malachar');
    expect(userMsg).toContain('Gaunt robed figure with hollow eyes');
  });

  it('includes up to 5 raw_speaker_lines as key dialogue', async () => {
    mockOpenAIResponse('a great image', 'smooth pan');
    const scene = { ...baseScene, raw_speaker_lines: ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5', 'Line 6'] };
    await buildVideoPrompt(scene, 'cinematic', 'My Campaign', null, [], []);
    const userMsg = mockCreate.mock.calls[0][0].messages[1].content as string;
    expect(userMsg).toContain('Line 1');
    expect(userMsg).toContain('Line 5');
    expect(userMsg).not.toContain('Line 6');
  });

  it('handles null raw_speaker_lines without crashing', async () => {
    mockOpenAIResponse('a great image', 'smooth pan');
    const scene = { ...baseScene, raw_speaker_lines: null as unknown as string[] };
    await expect(buildVideoPrompt(scene, 'cinematic', 'My Campaign', null, [], [])).resolves.toBeDefined();
    const userMsg = mockCreate.mock.calls[0][0].messages[1].content as string;
    expect(userMsg).not.toContain('Key dialogue');
  });

  it('omits Key dialogue section when raw_speaker_lines is empty', async () => {
    mockOpenAIResponse('a great image', 'smooth pan');
    await buildVideoPrompt({ ...baseScene, raw_speaker_lines: [] }, 'cinematic', 'My Campaign', null, [], []);
    const userMsg = mockCreate.mock.calls[0][0].messages[1].content as string;
    expect(userMsg).not.toContain('Key dialogue');
  });

  it('prepends the style prefix to imagePrompt but not motionPrompt', async () => {
    mockOpenAIResponse('wide plains at dusk', 'slow dolly forward');
    const result = await buildVideoPrompt(baseScene, 'cinematic', 'My Campaign', null, [], []);
    expect(result.imagePrompt).toMatch(/^Epic cinematic fantasy film/);
    // Style prefix is intentionally NOT applied to motionPrompt — it contains
    // image-composition terms that don't belong in a motion directive
    expect(result.motionPrompt).toBe('slow dolly forward');
  });

  it('throws when OpenAI returns empty content', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '' } }] });
    await expect(buildVideoPrompt(baseScene, 'cinematic', 'My Campaign', null, [], [])).rejects.toThrow('OpenAI returned empty prompt');
  });

  it('throws when OpenAI returns malformed JSON fields', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '{"imagePrompt":"only one field"}' } }] });
    await expect(buildVideoPrompt(baseScene, 'cinematic', 'My Campaign', null, [], [])).rejects.toThrow('malformed prompt JSON');
  });
});
