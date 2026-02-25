// src/utils/createListeningStream.ts
import fs from "fs";
import { pipeline } from "stream/promises";
import { opus } from "prism-media";
import type { VoiceReceiver } from "@discordjs/voice";
import type { User } from "discord.js";
import OpenAI from "openai";
import { config } from "../config.js";
import { appendLine } from "../lib/sessionState.js";

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

const activeStreams = new Map<string, boolean>(); // guard: one recording per user
const lastSpoke = new Map<string, number>();       // debounce: suppress rapid re-triggers

function formatElapsed(startedAt: Date): string {
    const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
    const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}

export async function createListeningStream(
    receiver: VoiceReceiver,
    user: User,
    guildId: string,
    sessionStart: Date,
) {
    // 2s inner debounce (on top of any debounce in record.ts)
    const now = Date.now();
    if (lastSpoke.has(user.id) && now - lastSpoke.get(user.id)! < 2000) return;
    lastSpoke.set(user.id, now);

    // Only one active stream per user at a time
    if (activeStreams.has(user.id)) return;
    activeStreams.set(user.id, true);

    if (!fs.existsSync("./recordings")) fs.mkdirSync("./recordings");

    const filename = `./recordings/${Date.now()}-${user.id}.ogg`;

    const opusStream = receiver.subscribe(user.id, {
        end: { behavior: 1, duration: 2000 }, // 2s silence window
    });
    opusStream.setMaxListeners(0);

    const oggStream = new opus.OggLogicalBitstream({
        opusHead: new opus.OpusHead({ channelCount: 2, sampleRate: 48000 }),
        pageSizeControl: { maxPackets: 10 },
    });

    const output = fs.createWriteStream(filename);
    console.log(`🎧 Started recording ${user.username}`);

    try {
        await pipeline(opusStream, oggStream, output);

        // Skip tiny clips (background noise / near-silent packets)
        const { size } = fs.statSync(filename);
        if (size < 5000) return;

        const result = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filename),
            model: "gpt-4o-mini-transcribe",
            prompt: "Dungeons and Dragons session transcript.",
        });

        const text = result.text.trim();
        if (text) {
            const line = `[${formatElapsed(sessionStart)}] ${user.username}: ${text}`;
            console.log(`🗣️ ${line}`);
            appendLine(guildId, line);
        }
    } catch (error) {
        console.warn(`⚠️ Stream error for ${user.username}:`, error);
    } finally {
        activeStreams.delete(user.id); // always release lock
        fs.unlink(filename, () => {}); // always clean up temp file
    }
}
