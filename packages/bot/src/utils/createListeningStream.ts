// src/utils/createListeningStream.ts
import fs from "fs";
import { pipeline } from "stream/promises";
import { opus } from "prism-media";
import type { VoiceReceiver } from "@discordjs/voice";
import type { User } from "discord.js";
import OpenAI from "openai";
import { config } from "../config.js";
import { insertLine, getSession } from "../lib/sessionState.js";

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

const activeStreams = new Map<string, boolean>(); // guard: one recording per user
const lastSpoke = new Map<string, number>();       // debounce: suppress rapid re-triggers

function formatElapsed(elapsedSeconds: number): string {
    const hh = String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0");
    const mm = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0");
    const ss = String(elapsedSeconds % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}

const WHISPER_PROMPT = "Dungeons and Dragons session transcript.";

function isHallucination(text: string): boolean {
    const t = text.trim();
    if (t.toLowerCase() === WHISPER_PROMPT.toLowerCase()) return true; // I-13: prompt echo
    if (/###/.test(t)) return true;                                    // I-14: template artifact
    if (/^[^a-zA-Z]+$/.test(t)) return true;                          // I-13: no letters at all
    if (/\w/.test(t) && !/[a-zA-Z\u00C0-\u024F]/.test(t)) return true; // I-13: all non-Latin
    return false;
}

export async function createListeningStream(
    receiver: VoiceReceiver,
    user: User,
    guildId: string,
    sessionStart: Date,
): Promise<void> {
    // 2s inner debounce (on top of any debounce in record.ts)
    const now = Date.now();
    if (lastSpoke.has(user.id) && now - lastSpoke.get(user.id)! < 2000) return;
    lastSpoke.set(user.id, now);

    // Only one active stream per user at a time
    if (activeStreams.has(user.id)) return;
    activeStreams.set(user.id, true);
    const clipStart = new Date(); // I-17: capture clip start before any async work

    if (!fs.existsSync("./recordings")) fs.mkdirSync("./recordings");

    const filename = `./recordings/${Date.now()}-${user.id}.ogg`;

    const opusStream = receiver.subscribe(user.id, {
        end: { behavior: 1, duration: 3500 }, // I-16: 3.5 s silence window (was 2 s)
    });
    opusStream.setMaxListeners(0);

    const oggStream = new opus.OggLogicalBitstream({
        opusHead: new opus.OpusHead({ channelCount: 2, sampleRate: 48000 }),
        pageSizeControl: { maxPackets: 10 },
    });

    const output = fs.createWriteStream(filename);
    // I-17: elapsed at clip start — used for timestamp label and sorted insert
    const clipElapsedSeconds = Math.floor((clipStart.getTime() - sessionStart.getTime()) / 1000);
    console.log(`🎧 Started recording ${user.username}`);

    try {
        await pipeline(opusStream, oggStream, output);

        // I-13: raised from 5 KB to 15 KB to filter near-silent clips
        const { size } = fs.statSync(filename);
        if (size < 15000) return;

        // Skip Whisper call and line write if the session was paused mid-utterance
        if (getSession(guildId)?.isPaused) return;

        const result = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filename),
            model: "gpt-4o-mini-transcribe",
            prompt: "Dungeons and Dragons session transcript.",
        });

        const text = result.text.trim();
        // I-13/I-14: filter hallucinations before inserting
        if (text && !isHallucination(text) && !getSession(guildId)?.isPaused) {
            const line = `[${formatElapsed(clipElapsedSeconds)}] ${user.username}: ${text}`;
            console.log(`🗣️ ${line}`);
            insertLine(guildId, clipElapsedSeconds, line); // I-17: sorted insert by clip start
        }
    } catch (error) {
        console.warn(`⚠️ Stream error for ${user.username}:`, error);
    } finally {
        activeStreams.delete(user.id);
        lastSpoke.set(user.id, Date.now()); // I-15: reset cooldown after stream ends
        fs.unlink(filename, () => {});
    }
}
