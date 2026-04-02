export interface TranscriptLine {
    ts: number;   // elapsed seconds from session start when clip began
    text: string; // "[HH:MM:SS] Username: speech"
}

interface SessionEntry {
    channelId: string;
    channelName: string;
    sessionTitle: string | null;
    startedAt: Date;
    lines: TranscriptLine[];
    isPaused: boolean;
    transcriptId: string | null;
    campaignId: string | null;
    checkpointInterval: ReturnType<typeof setInterval> | null;
}

const sessions = new Map<string, SessionEntry>();

export function startSession(
    guildId: string,
    channelId: string,
    channelName: string,
    sessionTitle: string | null,
): void {
    sessions.set(guildId, {
        channelId,
        channelName,
        sessionTitle,
        startedAt: new Date(),
        lines: [],
        isPaused: false,
        transcriptId: null,
        campaignId: null,
        checkpointInterval: null,
    });
}

export function pauseSession(guildId: string): void {
    const session = sessions.get(guildId);
    if (session) session.isPaused = true;
}

export function resumeSession(guildId: string): void {
    const session = sessions.get(guildId);
    if (session) session.isPaused = false;
}

export function insertLine(guildId: string, ts: number, text: string): void {
    const session = sessions.get(guildId);
    if (!session) return;
    const entry: TranscriptLine = { ts, text };
    let lo = 0, hi = session.lines.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (session.lines[mid].ts <= ts) lo = mid + 1;
        else hi = mid;
    }
    session.lines.splice(lo, 0, entry);
}

export function setTranscriptMeta(guildId: string, transcriptId: string, campaignId: string): void {
    const session = sessions.get(guildId);
    if (session) {
        session.transcriptId = transcriptId;
        session.campaignId = campaignId;
    }
}

export function setCheckpointInterval(guildId: string, interval: ReturnType<typeof setInterval>): void {
    const session = sessions.get(guildId);
    if (session) session.checkpointInterval = interval;
}

export function getSession(guildId: string): SessionEntry | undefined {
    return sessions.get(guildId);
}

export function getAllSessions(): Map<string, SessionEntry> {
    return sessions;
}

export function clearSession(guildId: string): void {
    sessions.delete(guildId);
}
