import { REST, Routes } from "discord.js";
import { config } from "./config.js";

const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

(async () => {
    console.log("Clearing all global application commands...");
    await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), { body: [] });
    console.log("Done. Global commands cleared.");
})();
