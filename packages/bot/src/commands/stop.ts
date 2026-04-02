// src/commands/stop.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { getSession, clearSession, type TranscriptLine } from "../lib/sessionState.js";
import { supabase } from "../lib/supabase.js";

export const data = new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop listening and save the session transcript to the campaign.");

export async function execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
        await interaction.reply({ content: "❌ This command must be used in a server.", ephemeral: true });
        return;
    }

    const session = getSession(guildId);
    if (!session) {
        await interaction.reply("⚠️ No active recording session to stop.");
        return;
    }

    // Defer because DB queries can exceed Discord's 3s window
    await interaction.deferReply();

    // Destroy voice connection
    const connection = getVoiceConnection(guildId);
    if (connection) {
        connection.destroy();
        console.log("🛑 Voice connection destroyed.");
    }

    const durationMs = Date.now() - session.startedAt.getTime();
    const durationMinutes = Math.round(durationMs / 60000);
    const sessionDate = session.startedAt.toISOString().split("T")[0]; // YYYY-MM-DD

    // Look up campaign via channel config
    const { data: channelConfig } = await supabase
        .from("discord_channel_configs")
        .select("campaign_id")
        .eq("channel_id", session.channelId)
        .single();

    if (!channelConfig) {
        clearSession(guildId);
        await interaction.editReply(
            `🛑 Stopped recording. **No campaign linked** — run \`/link campaign_id:<uuid>\` to enable transcript saving. (${session.lines.length} lines discarded)`,
        );
        return;
    }

    const campaignId = channelConfig.campaign_id;

    // Count existing transcripts for session numbering
    const { count } = await supabase
        .from("transcripts")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId);

    const sessionNumber = (count ?? 0) + 1;

    // Build title
    const title = session.sessionTitle
        ? `Session ${sessionNumber} — ${session.sessionTitle}`
        : `Session ${sessionNumber} — ${sessionDate}`;

    const content = session.lines.map((l) => l.text).join("\n") || "(no speech captured)";

    // Insert transcript
    const { data: transcript, error: insertError } = await supabase
        .from("transcripts")
        .insert({
            campaign_id: campaignId,
            title,
            session_number: sessionNumber,
            content,
            source: "discord",
            status: "processed",
            duration_minutes: durationMinutes,
            session_date: sessionDate,
            uploaded_by: null,
        })
        .select("id")
        .single();

    clearSession(guildId);

    if (insertError || !transcript) {
        console.error("Failed to insert transcript:", insertError);
        await interaction.editReply("❌ Recording stopped but failed to save transcript. Check bot logs.");
        return;
    }

    // Per-speaker word count for embed
    const speakerStats = buildSpeakerStats(session.lines);

    const embed = new EmbedBuilder()
        .setTitle(`🎬 Session Saved: ${title}`)
        .setColor(0x5865f2)
        .addFields(
            { name: "Session #", value: String(sessionNumber), inline: true },
            { name: "Duration", value: `${durationMinutes} min`, inline: true },
            { name: "Lines", value: String(session.lines.length), inline: true },
            { name: "Transcript ID", value: `\`${transcript.id}\``, inline: false },
        )
        .setFooter({ text: `Session date: ${sessionDate}` });

    if (speakerStats.length > 0) {
        embed.addFields({
            name: "Speaker Breakdown",
            value: speakerStats.map((s) => `**${s.name}**: ${s.words} words`).join(" | "),
            inline: false,
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

function buildSpeakerStats(lines: TranscriptLine[]): { name: string; words: number }[] {
    const wordCounts = new Map<string, number>();
    for (const entry of lines) {
        // Format: [HH:MM:SS] Username: text
        const match = entry.text.match(/^\[\d{2}:\d{2}:\d{2}\] (.+?): (.+)$/);
        if (!match) continue;
        const [, speaker, text] = match;
        wordCounts.set(speaker, (wordCounts.get(speaker) ?? 0) + text.split(/\s+/).length);
    }
    return Array.from(wordCounts.entries())
        .map(([name, words]) => ({ name, words }))
        .sort((a, b) => b.words - a.words);
}
