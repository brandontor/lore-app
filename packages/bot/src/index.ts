import { Client, Events } from "discord.js";
import { config } from "./config.js";
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";
import { getAllSessions } from "./lib/sessionState.js";
import { stopCheckpointTimer } from "./lib/checkpointing.js";

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

// Flush all in-progress transcripts before Railway/process shutdown
async function gracefulShutdown() {
    console.log("⏳ SIGTERM received — flushing active recording sessions…");
    const sessions = getAllSessions();
    const results = await Promise.allSettled(
        Array.from(sessions.keys()).map((guildId) => stopCheckpointTimer(guildId))
    );
    results.forEach((result, i) => {
        if (result.status === "rejected") {
            console.error(`❌ Failed to flush session ${Array.from(sessions.keys())[i]}:`, result.reason);
        }
    });
    console.log("✅ All sessions flushed. Exiting.");
    process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

client.login(config.DISCORD_TOKEN);
