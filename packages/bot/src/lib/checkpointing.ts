import { supabase } from "./supabase.js";
import { getSession, setTranscriptMeta, setCheckpointInterval } from "./sessionState.js";

const CHECKPOINT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export async function initCheckpoint(guildId: string, campaignId: string): Promise<string | null> {
    const session = getSession(guildId);
    if (!session) return null;

    const sessionDate = session.startedAt.toISOString().split("T")[0];

    const { data, error } = await supabase
        .from("transcripts")
        .insert({
            campaign_id: campaignId,
            title: session.sessionTitle ?? `Session — ${sessionDate}`,
            session_number: null,
            content: "(recording in progress…)",
            source: "discord",
            status: "in_progress",
            duration_minutes: 0,
            session_date: sessionDate,
            uploaded_by: null,
        })
        .select("id")
        .single();

    if (error || !data) {
        console.error("❌ Failed to create checkpoint transcript row:", error);
        return null;
    }

    setTranscriptMeta(guildId, data.id, campaignId);
    return data.id;
}

export async function saveCheckpoint(guildId: string): Promise<void> {
    const session = getSession(guildId);
    if (!session?.transcriptId) return;

    const content = session.lines.map((l) => l.text).join("\n") || "(no speech captured yet)";
    const durationMs = Date.now() - session.startedAt.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    const { error } = await supabase
        .from("transcripts")
        .update({ content, duration_minutes: durationMinutes })
        .eq("id", session.transcriptId);

    if (error) {
        console.error("❌ Checkpoint save failed:", error);
    } else {
        console.log(`💾 Checkpoint saved for guild ${guildId} (${session.lines.length} lines)`);
    }
}

export function startCheckpointTimer(guildId: string): void {
    const interval = setInterval(() => {
        saveCheckpoint(guildId).catch((err) => console.error("Checkpoint error:", err));
    }, CHECKPOINT_INTERVAL_MS);
    setCheckpointInterval(guildId, interval);
}

export async function stopCheckpointTimer(guildId: string): Promise<void> {
    const session = getSession(guildId);
    if (!session) return;

    if (session.checkpointInterval) {
        clearInterval(session.checkpointInterval);
        session.checkpointInterval = null;
    }

    // Final flush
    await saveCheckpoint(guildId);
}
