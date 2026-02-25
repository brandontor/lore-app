// src/commands/unlink.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { supabase } from "../lib/supabase.js";

export const data = new SlashCommandBuilder()
    .setName("unlink")
    .setDescription("Unlink the current voice channel from its campaign.");

export async function execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;

    if (!member.voice.channel) {
        await interaction.reply({ content: "❌ You must be in a voice channel to use this command.", ephemeral: true });
        return;
    }

    const channelId = member.voice.channel.id;
    const channelName = member.voice.channel.name;

    const { error } = await supabase
        .from("discord_channel_configs")
        .delete()
        .eq("channel_id", channelId);

    if (error) {
        console.error("Failed to delete discord_channel_configs row:", error);
        await interaction.reply({ content: "❌ Failed to unlink channel. Please try again.", ephemeral: true });
        return;
    }

    await interaction.reply({
        content: `✅ Voice channel **#${channelName}** has been unlinked. Transcripts will no longer be saved automatically.`,
        ephemeral: true,
    });
}
