// src/commands/link.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { supabase } from "../lib/supabase.js";

export const data = new SlashCommandBuilder()
    .setName("link")
    .setDescription("Link the current voice channel to a campaign for automatic transcript saving.")
    .addStringOption((option) =>
        option
            .setName("campaign_id")
            .setDescription("Campaign UUID (copy from the web app campaign settings)")
            .setRequired(true),
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;

    if (!member.voice.channel) {
        await interaction.reply({ content: "❌ You must be in a voice channel to use this command.", ephemeral: true });
        return;
    }

    const guildId = interaction.guildId;
    if (!guildId) {
        await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
        return;
    }

    const campaignId = interaction.options.getString("campaign_id", true).trim();
    const channelId = member.voice.channel.id;
    const channelName = member.voice.channel.name;
    const guildName = interaction.guild?.name ?? null;

    // Verify campaign exists
    const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("id", campaignId)
        .single();

    if (campaignError || !campaign) {
        await interaction.reply({ content: `❌ Campaign \`${campaignId}\` not found. Double-check the ID from the web app.`, ephemeral: true });
        return;
    }

    // Upsert channel→campaign mapping
    const { error: upsertError } = await supabase
        .from("discord_channel_configs")
        .upsert(
            { channel_id: channelId, campaign_id: campaignId, linked_by: null, guild_id: guildId, guild_name: guildName, channel_name: channelName },
            { onConflict: "channel_id" },
        );

    if (upsertError) {
        console.error("Failed to upsert discord_channel_configs:", upsertError);
        await interaction.reply({ content: "❌ Failed to link channel. Please try again.", ephemeral: true });
        return;
    }

    await interaction.reply({
        content: `✅ Voice channel **#${channelName}** linked to campaign **${campaign.name}**. Transcripts from \`/record\` sessions will now be saved automatically.`,
        ephemeral: true,
    });
}
