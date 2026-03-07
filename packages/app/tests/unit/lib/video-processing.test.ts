import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadKeyframe } from '@/lib/video-processing';

// ---- fal mock ----
const mockIsFalVideoUrl = vi.fn();

vi.mock('@/lib/fal', () => ({
  isFalVideoUrl: (url: string) => mockIsFalVideoUrl(url),
  DEFAULT_CLIP_DURATION: 5,
}));

// ---- Supabase mock ----
const mockUpload = vi.fn();
const mockStorageFrom = vi.fn(() => ({ upload: mockUpload }));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    storage: { from: mockStorageFrom },
  })),
}));

// ---------------------------------------------------------------------------

const FAL_URL = 'https://v3.fal.media/files/abc123/keyframe.jpg';
const CAMPAIGN_ID = 'campaign-uuid';
const VIDEO_ID = 'video-uuid';
const SUPABASE_URL = 'https://project.supabase.co';

function makeImageResponse(contentType: string, ok = true): Response {
  return {
    ok,
    headers: {
      get: (h: string) => (h === 'content-type' ? contentType : null),
    },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  mockIsFalVideoUrl.mockReturnValue(true);
  mockUpload.mockResolvedValue({ error: null });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeImageResponse('image/jpeg')));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
describe('uploadKeyframe', () => {
  it('throws when the URL is not from an allowed fal.ai hostname', async () => {
    mockIsFalVideoUrl.mockReturnValueOnce(false);
    await expect(uploadKeyframe('https://evil.com/img.jpg', CAMPAIGN_ID, VIDEO_ID))
      .rejects.toThrow('Unexpected image URL hostname');
  });

  it('throws when fetch returns a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeImageResponse('image/jpeg', false)));
    await expect(uploadKeyframe(FAL_URL, CAMPAIGN_ID, VIDEO_ID))
      .rejects.toThrow('Unexpected content-type');
  });

  it('throws when the response content-type is not an image', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeImageResponse('text/html')));
    await expect(uploadKeyframe(FAL_URL, CAMPAIGN_ID, VIDEO_ID))
      .rejects.toThrow('Unexpected content-type');
  });

  it('uses jpg extension for JPEG content-type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeImageResponse('image/jpeg')));
    const { storageUrl } = await uploadKeyframe(FAL_URL, CAMPAIGN_ID, VIDEO_ID);
    expect(storageUrl).toContain('_keyframe.jpg');
    expect(mockUpload).toHaveBeenCalledWith(
      `${CAMPAIGN_ID}/${VIDEO_ID}_keyframe.jpg`,
      expect.any(ArrayBuffer),
      expect.objectContaining({ contentType: 'image/jpeg' })
    );
  });

  it('uses png extension for PNG content-type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeImageResponse('image/png')));
    const { storageUrl } = await uploadKeyframe(FAL_URL, CAMPAIGN_ID, VIDEO_ID);
    expect(storageUrl).toContain('_keyframe.png');
    expect(mockUpload).toHaveBeenCalledWith(
      `${CAMPAIGN_ID}/${VIDEO_ID}_keyframe.png`,
      expect.any(ArrayBuffer),
      expect.objectContaining({ contentType: 'image/png' })
    );
  });

  it('uses webp extension for WebP content-type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeImageResponse('image/webp')));
    const { storageUrl } = await uploadKeyframe(FAL_URL, CAMPAIGN_ID, VIDEO_ID);
    expect(storageUrl).toContain('_keyframe.webp');
  });

  it('throws when Supabase upload returns an error', async () => {
    mockUpload.mockResolvedValueOnce({ error: { message: 'Bucket not found' } });
    await expect(uploadKeyframe(FAL_URL, CAMPAIGN_ID, VIDEO_ID))
      .rejects.toThrow('Keyframe upload failed: Bucket not found');
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL is not configured', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    await expect(uploadKeyframe(FAL_URL, CAMPAIGN_ID, VIDEO_ID))
      .rejects.toThrow('NEXT_PUBLIC_SUPABASE_URL not configured');
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  });

  it('returns the correct public Supabase storage URL', async () => {
    const { storageUrl } = await uploadKeyframe(FAL_URL, CAMPAIGN_ID, VIDEO_ID);
    expect(storageUrl).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/campaign-videos/${CAMPAIGN_ID}/${VIDEO_ID}_keyframe.jpg`
    );
  });

  it('uploads to the campaign-videos bucket', async () => {
    await uploadKeyframe(FAL_URL, CAMPAIGN_ID, VIDEO_ID);
    expect(mockStorageFrom).toHaveBeenCalledWith('campaign-videos');
  });

  it('uses upsert:true so re-runs overwrite the previous keyframe', async () => {
    await uploadKeyframe(FAL_URL, CAMPAIGN_ID, VIDEO_ID);
    expect(mockUpload).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(ArrayBuffer),
      expect.objectContaining({ upsert: true })
    );
  });
});
