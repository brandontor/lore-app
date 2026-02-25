// src/commands/status.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getSession } from "../lib/sessionState.js";

export const data = new SlashCommandBuilder()
    .setName("status")
    .setDescription("Show the current recording session status.");

export async function execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    const session = guildId ? getSession(guildId) : undefined;

    if (!session) {
        await interaction.reply({ content: "💤 No active recording session.", ephemeral: true });
        return;
    }

    const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");

    const embed = new EmbedBuilder()
        .setTitle("🎙️ Recording Active")
        .setColor(0x57f287)
        .addFields(
            { name: "Channel", value: `#${session.channelName}`, inline: true },
            { name: "Duration", value: `${mm}:${ss}`, inline: true },
            { name: "Lines captured", value: String(session.lines.length), inline: true },
        );

    if (session.sessionTitle) {
        embed.addFields({ name: "Title", value: session.sessionTitle, inline: false });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
