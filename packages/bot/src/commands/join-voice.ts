// src/commands/join-voice.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';

export const data = new SlashCommandBuilder()
    .setName('joinvoice')
    .setDescription('Join your voice channel and start recording');

export async function execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;

    if (!member.voice.channel) {
        await interaction.reply('❌ You need to be in a voice channel first.');
        return;
    }

    const channel = member.voice.channel;
    const guild = member.guild;

    await interaction.reply(`🎙️ Joining ${channel.name}...`);

    joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: true
    });

    await interaction.followUp(`✅ Joined Voice Channel: ${channel.name}`);
}
