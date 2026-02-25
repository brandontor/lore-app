import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

const mockGetClaims = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getClaims: mockGetClaims },
  })),
}));

function makeRequest(pathname: string) {
  return new NextRequest(new URL(pathname, 'http://localhost:3000'));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetClaims.mockResolvedValue({ data: null });
});

describe('unauthenticated user', () => {
  it('redirects /dashboard to /login with redirect param', async () => {
    const res = await updateSession(makeRequest('/dashboard'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/login\?redirect=%2Fdashboard/);
  });

  it('redirects /campaigns to /login', async () => {
    const res = await updateSession(makeRequest('/campaigns'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/login\?redirect=%2Fcampaigns/);
  });

  it('redirects /transcripts to /login', async () => {
    const res = await updateSession(makeRequest('/transcripts'));
    expect(res.status).toBe(307);
  });

  it('redirects /videos to /login', async () => {
    const res = await updateSession(makeRequest('/videos'));
    expect(res.status).toBe(307);
  });

  it('allows /login through without redirect', async () => {
    const res = await updateSession(makeRequest('/login'));
    expect(res.status).not.toBe(307);
  });

  it('allows /register through without redirect', async () => {
    const res = await updateSession(makeRequest('/register'));
    expect(res.status).not.toBe(307);
  });

  it('allows /invite/[token] through without redirect', async () => {
    const res = await updateSession(makeRequest('/invite/abc123'));
    expect(res.status).not.toBe(307);
  });
});

describe('authenticated user', () => {
  beforeEach(() => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'user-id-123' } } });
  });

  it('redirects /login to /dashboard', async () => {
    const res = await updateSession(makeRequest('/login'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
  });

  it('redirects /register to /dashboard', async () => {
    const res = await updateSession(makeRequest('/register'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
  });

  it('allows /dashboard through', async () => {
    const res = await updateSession(makeRequest('/dashboard'));
    expect(res.status).not.toBe(307);
  });

  it('allows /campaigns through', async () => {
    const res = await updateSession(makeRequest('/campaigns'));
    expect(res.status).not.toBe(307);
  });

  it('allows /campaigns/[id] through', async () => {
    const res = await updateSession(makeRequest('/campaigns/some-id'));
    expect(res.status).not.toBe(307);
  });
});
