// src/commands/resume.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { getSession, resumeSession } from "../lib/sessionState.js";

export const data = new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume audio capture after a pause.");

export async function execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
        await interaction.reply({ content: "❌ This command must be used in a server.", ephemeral: true });
        return;
    }

    const session = getSession(guildId);
    if (!session) {
        await interaction.reply({ content: "❌ No active recording session. Use `/record` to start one.", ephemeral: true });
        return;
    }

    if (!session.isPaused) {
        await interaction.reply({ content: "⚠️ Recording is not paused.", ephemeral: true });
        return;
    }

    resumeSession(guildId);
    await interaction.reply({ content: "▶️ Recording resumed.", ephemeral: true });
}
