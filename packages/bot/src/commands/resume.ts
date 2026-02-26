// src/commands/resume.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { getSession, resumeSession } from "../lib/sessionState.js";

export const data = new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume audio capture after a pause.");

export async function execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
        await interaction.reply("❌ This command must be used in a server.");
        return;
    }

    const session = getSession(guildId);
    if (!session) {
        await interaction.reply("❌ No active recording session. Use `/record` to start one.");
        return;
    }

    if (!session.isPaused) {
        await interaction.reply("⚠️ Recording is not paused.");
        return;
    }

    resumeSession(guildId);
    await interaction.reply("▶️ Recording resumed.");
}
