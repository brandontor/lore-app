import dotenv from "dotenv";

dotenv.config();

const {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    GUILD_ID,
    OPENAI_API_KEY,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !GUILD_ID) {
    throw new Error("Missing required environment variables: DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID");
}

if (!OPENAI_API_KEY) {
    throw new Error("Missing required environment variable: OPENAI_API_KEY");
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
}

export const config = {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    GUILD_ID,
    OPENAI_API_KEY,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
};
