// src/commands/pause.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { getSession, pauseSession } from "../lib/sessionState.js";

export const data = new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause audio capture without leaving the voice channel.");

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

    if (session.isPaused) {
        await interaction.reply({ content: "⚠️ Already paused. Use `/resume` to continue capturing audio.", ephemeral: true });
        return;
    }

    pauseSession(guildId);
    await interaction.reply({ content: "⏸️ Recording paused. Use `/resume` to continue capturing audio.", ephemeral: true });
}
