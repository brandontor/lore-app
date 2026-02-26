// src/commands/pause.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { getSession, pauseSession } from "../lib/sessionState.js";

export const data = new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause audio capture without leaving the voice channel.");

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

    if (session.isPaused) {
        await interaction.reply("⚠️ Already paused. Use `/resume` to continue capturing audio.");
        return;
    }

    pauseSession(guildId);
    await interaction.reply("⏸️ Recording paused. Use `/resume` to continue capturing audio.");
}
