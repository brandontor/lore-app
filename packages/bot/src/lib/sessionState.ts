interface SessionEntry {
    channelId: string;
    channelName: string;
    sessionTitle: string | null;
    startedAt: Date;
    lines: string[];
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
    });
}

export function appendLine(guildId: string, line: string): void {
    sessions.get(guildId)?.lines.push(line);
}

export function getSession(guildId: string): SessionEntry | undefined {
    return sessions.get(guildId);
}

export function clearSession(guildId: string): void {
    sessions.delete(guildId);
}
