import type { VideoWithSession, VideoSession } from '@/lib/queries/videos';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export function getStorageUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/campaign-videos/${storagePath}`;
}

export function formatStyle(style: string): string {
  return style
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function groupVideosBySession(videos: VideoWithSession[]): {
  sessions: VideoSession[];
  ungrouped: VideoWithSession[];
} {
  const sessionMap = new Map<string, VideoSession>();
  const ungrouped: VideoWithSession[] = [];

  for (const video of videos) {
    if (!video.transcript_id) {
      ungrouped.push(video);
      continue;
    }
    if (!sessionMap.has(video.transcript_id)) {
      sessionMap.set(video.transcript_id, {
        transcript_id: video.transcript_id,
        transcript_title: video.transcript_title ?? 'Untitled Session',
        session_number: video.session_number,
        session_date: video.session_date,
        videos: [],
      });
    }
    sessionMap.get(video.transcript_id)!.videos.push(video);
  }

  // Order clips within each session by scene position, falling back to creation time
  for (const session of sessionMap.values()) {
    session.videos.sort((a, b) => {
      if (a.scene_start_timestamp && b.scene_start_timestamp) {
        return a.scene_start_timestamp.localeCompare(b.scene_start_timestamp);
      }
      return a.created_at.localeCompare(b.created_at);
    });
  }

  // Sort sessions newest first (by session_date, then session_number, then first clip date)
  const sessions = Array.from(sessionMap.values()).sort((a, b) => {
    if (a.session_date && b.session_date) {
      return b.session_date.localeCompare(a.session_date);
    }
    if (a.session_number !== null && b.session_number !== null) {
      return b.session_number - a.session_number;
    }
    const aDate = a.videos[0]?.created_at ?? '';
    const bDate = b.videos[0]?.created_at ?? '';
    return bDate.localeCompare(aDate);
  });

  return { sessions, ungrouped };
}
