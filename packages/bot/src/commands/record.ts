// src/commands/record.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import { createListeningStream } from "../utils/createListeningStream.js";
import { startSession, getSession } from "../lib/sessionState.js";
import { supabase } from "../lib/supabase.js";
import { initCheckpoint, startCheckpointTimer } from "../lib/checkpointing.js";

export const data = new SlashCommandBuilder()
    .setName("record")
    .setDescription("Start listening to all users and transcribe speech automatically after pauses.")
    .addStringOption((option) =>
        option
            .setName("title")
            .setDescription("Optional session title (e.g. 'The Dragon's Lair')")
            .setRequired(false),
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;

    if (!member.voice.channel) {
        await interaction.reply("❌ You must be in a voice channel to use this command.");
        return;
    }

    const guildId = member.guild.id;

    if (getSession(guildId)) {
        await interaction.reply("⚠️ Already recording in this guild. Use `/stop` first.");
        return;
    }

    const title = interaction.options.getString("title");
    const channelId = member.voice.channel.id;
    const channelName = member.voice.channel.name;

    startSession(guildId, channelId, channelName, title ?? null);

    // Look up campaign to enable periodic checkpointing
    const { data: channelConfig } = await supabase
        .from("discord_channel_configs")
        .select("campaign_id")
        .eq("channel_id", channelId)
        .single();

    if (channelConfig) {
        const transcriptId = await initCheckpoint(guildId, channelConfig.campaign_id);
        if (transcriptId) {
            startCheckpointTimer(guildId);
            await interaction.reply(`🎙️ Joining **${channelName}** and listening for speech… (checkpointing every 2 min)`);
        } else {
            await interaction.reply(`🎙️ Joining **${channelName}** and listening for speech… ⚠️ Checkpoint setup failed — transcript will only be saved on \`/stop\`.`);
        }
    } else {
        await interaction.reply(`🎙️ Joining **${channelName}** and listening for speech… ⚠️ No campaign linked — run \`/link campaign_id:<uuid>\` to enable saving. Data will be lost if the bot restarts.`);
    }

    let connection = getVoiceConnection(guildId);
    if (!connection) {
        connection = joinVoiceChannel({
            channelId,
            guildId,
            adapterCreator: member.guild.voiceAdapterCreator,
            selfDeaf: false,
        });
        console.log(`✅ Joined voice channel: ${channelName}`);
    }

    // Avoid attaching duplicate handlers
    connection.receiver.speaking.removeAllListeners("start");

    connection.receiver.speaking.on("start", async (userId) => {
        const currentSession = getSession(guildId);
        if (!currentSession || currentSession.isPaused) return;
        const user = await member.guild.client.users.fetch(userId);
        if (!user || user.bot) return;
        await createListeningStream(connection.receiver, user, guildId, currentSession.startedAt);
    });
}
