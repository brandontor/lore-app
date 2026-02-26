// src/commands/record.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import { createListeningStream } from "../utils/createListeningStream.js";
import { startSession, getSession } from "../lib/sessionState.js";

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

    await interaction.reply(`🎙️ Joining **${channelName}** and listening for speech...`);

    let connection = getVoiceConnection(guildId);
    if (!connection) {
        connection = joinVoiceChannel({
            channelId,
            guildId,
            adapterCreator: member.guild.voiceAdapterCreator,
            selfDeaf: false,
            daveEncryption: false, // opt out of E2EE — @snazzah/davey key exchange doesn't complete reliably
        });
        console.log(`✅ Joined voice channel: ${channelName}`);
    }

    // Avoid attaching duplicate handlers
    connection.receiver.speaking.removeAllListeners("start");

    const session = getSession(guildId)!;

    connection.receiver.speaking.on("start", async (userId) => {
        const user = await member.guild.client.users.fetch(userId);
        if (!user || user.bot) return;
        await createListeningStream(connection.receiver, user, guildId, session.startedAt);
    });
}
