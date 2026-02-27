"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ScrollText, Clapperboard, Palette, Wand2, Check, Lock, User, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SceneCard } from "@/components/transcripts/SceneCard";
import type { Transcript, Character, TranscriptScene } from "@lore/shared";

const steps = [
  { id: 1, label: "Select Transcripts" },
  { id: 2, label: "Select Scenes" },
  { id: 3, label: "Style & Tone" },
  { id: 4, label: "Review & Generate" },
];

const styles = [
  { id: "cinematic", label: "Cinematic", description: "Epic fantasy film aesthetic — dramatic lighting, sweeping vistas" },
  { id: "anime", label: "Anime", description: "Japanese animation style with expressive characters and vibrant colors" },
  { id: "painterly", label: "Painterly", description: "Digital oil painting reminiscent of classic fantasy book covers" },
  { id: "dark-fantasy", label: "Dark Fantasy", description: "Gritty, atmospheric visuals inspired by dark high fantasy art" },
];

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function GenerateVideoWizard({
  campaignId,
  transcripts,
  characters,
  allScenes,
}: {
  campaignId: string;
  transcripts: Transcript[];
  characters: Character[];
  allScenes: TranscriptScene[];
}) {
  const [step, setStep] = useState(1);
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  function toggleTranscript(id: string) {
    setSelectedTranscripts((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function handleSceneToggle(id: string, selected: boolean) {
    setSelectedSceneIds((prev) =>
      selected ? [...prev.filter((s) => s !== id), id] : prev.filter((s) => s !== id)
    );
  }

  function goToStep2() {
    // Pre-populate selectedSceneIds with scenes selected_for_video for the chosen transcripts
    const relevantScenes = allScenes.filter((s) => selectedTranscripts.includes(s.transcript_id));
    const preSelected = relevantScenes.filter((s) => s.selected_for_video).map((s) => s.id);
    setSelectedSceneIds(preSelected);
    setStep(2);
  }

  // Scenes for the transcripts currently selected
  const scenesForSelectedTranscripts = allScenes.filter((s) =>
    selectedTranscripts.includes(s.transcript_id)
  );

  // Transcripts that have no scenes extracted
  const transcriptsWithoutScenes = selectedTranscripts.filter(
    (tid) => !allScenes.some((s) => s.transcript_id === tid)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/campaigns/${campaignId}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Campaign
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Generate Video</h1>
      </div>

      {/* Stepper */}
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step > s.id
                    ? "bg-violet-600 text-white"
                    : step === s.id
                    ? "border-2 border-violet-600 text-violet-600"
                    : "border-2 border-zinc-200 text-zinc-400 dark:border-zinc-700"
                }`}
              >
                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
              </div>
              <span
                className={`text-sm font-medium ${
                  step >= s.id ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-8 ${step > s.id ? "bg-violet-600" : "bg-zinc-200 dark:bg-zinc-700"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Transcripts */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Select Transcripts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-500">
              Choose which session transcripts to include in the video.
            </p>
            {transcripts.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title="No transcripts yet"
                description="Add a session transcript to this campaign before generating a video."
              />
            ) : (
              transcripts.map((t) => {
                const label = t.title || (t.session_number !== null ? `Session ${t.session_number}` : "Untitled");
                const date = t.session_date
                  ? new Date(t.session_date).toLocaleDateString()
                  : new Date(t.created_at).toLocaleDateString();
                const duration = formatDuration(t.duration_minutes);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTranscript(t.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                      selectedTranscripts.includes(t.id)
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        selectedTranscripts.includes(t.id)
                          ? "border-violet-600 bg-violet-600"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {selectedTranscripts.includes(t.id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
                      <p className="text-sm text-zinc-500">{date}{duration ? ` · ${duration}` : ""}</p>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Scenes */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5" />
              Select Scenes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-500">
              Toggle which scenes to include in your video. Scenes are extracted from transcripts on the transcript detail page.
            </p>

            {/* Warning for transcripts missing scenes */}
            {transcriptsWithoutScenes.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-700 dark:bg-amber-950/30">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="text-sm text-amber-700 dark:text-amber-400">
                  <p className="font-medium">Some transcripts have no extracted scenes.</p>
                  <p className="mt-0.5 text-xs">
                    Open the transcript detail page and click &quot;Extract Scenes&quot;, then return here to include them.
                  </p>
                  <ul className="mt-1 list-disc pl-4 text-xs">
                    {transcriptsWithoutScenes.map((tid) => {
                      const t = transcripts.find((tr) => tr.id === tid);
                      if (!t) return null;
                      return (
                        <li key={tid}>
                          <Link href={`/transcripts/${tid}`} className="underline hover:no-underline">
                            {t.title || (t.session_number !== null ? `Session ${t.session_number}` : 'Untitled')}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}

            {selectedTranscripts.length === 0 ? (
              <p className="text-sm text-zinc-500">No transcripts selected.</p>
            ) : (
              scenesForSelectedTranscripts.map((scene) => (
                <SceneCard
                  key={scene.id}
                  scene={{ ...scene, selected_for_video: selectedSceneIds.includes(scene.id) }}
                  canWrite={true}
                  readOnly={true}
                  onToggle={handleSceneToggle}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Style & Tone */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Style & Tone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-500">
              Choose the visual style for your generated video.
            </p>
            {styles.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStyle(s.id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                  selectedStyle === s.id
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selectedStyle === s.id
                      ? "border-violet-600 bg-violet-600"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {selectedStyle === s.id && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{s.label}</p>
                  <p className="text-sm text-zinc-500">{s.description}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review & Generate */}
      {step === 4 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Review</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-500">Selected Transcripts</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTranscripts.length > 0
                    ? transcripts
                        .filter((t) => selectedTranscripts.includes(t.id))
                        .map((t) => (
                          <Badge key={t.id}>
                            {t.title || (t.session_number !== null ? `Session ${t.session_number}` : "Untitled")}
                          </Badge>
                        ))
                    : <span className="text-sm text-zinc-400">None selected</span>
                  }
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-500">Selected Scenes</p>
                <div className="flex flex-wrap gap-2">
                  {selectedSceneIds.length > 0
                    ? allScenes
                        .filter((s) => selectedSceneIds.includes(s.id))
                        .map((s) => (
                          <Badge key={s.id} variant="outline">{s.title}</Badge>
                        ))
                    : <span className="text-sm text-zinc-400">None selected</span>
                  }
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-500">Visual Style</p>
                {selectedStyle
                  ? <Badge variant="outline">{styles.find((s) => s.id === selectedStyle)?.label}</Badge>
                  : <span className="text-sm text-zinc-400">None selected</span>
                }
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-500">Party Characters</p>
                {characters.length > 0 ? (
                  <ul className="space-y-2">
                    {characters.map((c) => (
                      <li key={c.id} className="flex items-center gap-3">
                        {c.portrait_url ? (
                          <img src={c.portrait_url} alt={c.name} loading="lazy" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <User className="h-4 w-4 text-zinc-400" />
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{c.name}</span>
                          {(c.race || c.class) && (
                            <span className="text-xs text-zinc-400">
                              {' — '}Lvl {c.level}{c.race ? ` ${c.race}` : ''}{c.class ? ` ${c.class}` : ''}
                            </span>
                          )}
                          {c.appearance && (
                            <p className="line-clamp-1 text-xs text-zinc-400">{c.appearance}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm text-zinc-400">No characters added to this campaign</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Coming Soon overlay */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 dark:bg-zinc-900/90">
              <Lock className="mb-3 h-10 w-10 text-zinc-400" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Video Generation Coming Soon</h3>
              <p className="mt-1 text-sm text-zinc-500">
                The AI video generation pipeline is under development. Stay tuned!
              </p>
            </div>
            <CardContent className="py-12 text-center opacity-30">
              <Wand2 className="mx-auto mb-4 h-12 w-12 text-violet-600" />
              <p className="text-lg font-semibold">Generate Video</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        {step < 4 ? (
          <Button
            onClick={step === 1 ? goToStep2 : () => setStep((s) => s + 1)}
            disabled={step === 1 && selectedTranscripts.length === 0}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button disabled>
            <Wand2 className="h-4 w-4" />
            Generate (Coming Soon)
          </Button>
        )}
      </div>
    </div>
  );
}
