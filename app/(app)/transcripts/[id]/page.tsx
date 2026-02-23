import Link from "next/link";
import { ChevronLeft, Sword, Calendar, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const placeholderText = `
[19:02] DM: You stand at the gates of Barovia. The mist swirls around your ankles, thick and cold. The iron gates creak open as if inviting you in — or daring you to enter.

[19:04] Aldric: I hold my shield up and step forward. "We face this together."

[19:05] Zyx: *rolls Arcana* — 18. I try to sense any magical aura emanating from the mist.

[19:06] DM: Zyx, you feel a powerful transmutation magic woven into the very fabric of the mist. It's not just weather — it's a barrier. Something doesn't want you to leave.

[19:08] Mira: I scan the rooftops for any movement. *Perception check* — 22.

[19:09] DM: Mira, in the upper window of the burgmaster's mansion, you see the pale face of a young boy staring down at you. He mouths something you can't quite make out. Then he's gone.

[19:11] Thorin: *mutters* "This place gives me the creeps. Let's find shelter before dark."

[19:13] DM: As if on cue, the last sliver of sun dips below the Balinok Mountains. The darkness that falls over Barovia is total, absolute — and from somewhere deep in the village, you hear the mournful howl of wolves.

[19:15] Aldric: *rolls Insight* — 14. I'm looking for any friendly faces, any signs of ordinary life in this village.

[19:16] DM: The few villagers you see quickly avert their gaze and hurry indoors. No one meets your eye. No one speaks. Barovia is a village of broken people.
`.trim();

export default async function TranscriptViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: _id } = await params;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/transcripts"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Transcripts
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Session 14</h1>
              <Badge variant="success">processed</Badge>
            </div>
            <p className="text-sm text-zinc-500">Curse of Strahd</p>
          </div>
          <Button variant="secondary">Assign to Campaign</Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transcript text */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Session Transcript</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[600px] overflow-y-auto rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {placeholderText}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metadata sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Session Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500">Date</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">Feb 18, 2026</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500">Duration</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">3h 42m</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Sword className="h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500">Campaign</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">Curse of Strahd</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Users className="h-4 w-4 shrink-0 mt-0.5 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500">Participants</p>
                  <ul className="mt-1 space-y-1 text-zinc-900 dark:text-zinc-100">
                    <li>DM (Game Master)</li>
                    <li>Aldric (Paladin)</li>
                    <li>Zyx (Wizard)</li>
                    <li>Mira (Rogue)</li>
                    <li>Thorin (Fighter)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Source</CardTitle></CardHeader>
            <CardContent>
              <Badge variant="outline">Discord Bot</Badge>
              <p className="mt-2 text-xs text-zinc-500">
                Automatically imported via the Lore Discord bot.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
