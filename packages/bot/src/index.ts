import { Client, Events } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";

const client = new Client({
    intents: ["Guilds", "GuildMessages", "DirectMessages", "GuildVoiceStates"],
});

client.once(Events.ClientReady, () => {
    console.log("Discord bot is ready! 🤖");
});

client.on(Events.GuildCreate, async (guild) => {
    await deployCommands({ guildId: guild.id });
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand() || !interaction.isChatInputCommand()) return;

    const command = commands[interaction.commandName as keyof typeof commands];
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(err);
        await interaction.reply({ content: "❌ Command failed.", ephemeral: true });
    }
});

client.login(config.DISCORD_TOKEN);
