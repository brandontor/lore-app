"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ScrollText, Clapperboard, Palette, Wand2, Check, User, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SceneCard } from "@/components/transcripts/SceneCard";
import { generateVideo } from "@/lib/actions/videos";
import { MAX_SCENES } from "@/lib/video-constants";
import { DEFAULT_MOTION_INTENSITY, DEFAULT_CLIP_DURATION } from "@/lib/fal";
import type { Transcript, Character, TranscriptScene, VideoStyle, CameraPreset } from "@lore/shared";

const steps = [
  { id: 1, label: "Select Transcripts" },
  { id: 2, label: "Select Scenes" },
  { id: 3, label: "Style & Tone" },
  { id: 4, label: "Review & Generate" },
];

const cameraPresets: { id: CameraPreset; label: string; description: string }[] = [
  { id: "auto", label: "Auto", description: "AI picks camera based on scene mood" },
  { id: "slow-dolly-in", label: "Slow Dolly In", description: "Emotional intensity, character reveal" },
  { id: "tracking-shot", label: "Tracking Shot", description: "Follows action laterally" },
  { id: "crane-up", label: "Crane Up", description: "Reveals scale, triumphant moments" },
  { id: "crash-zoom", label: "Crash Zoom", description: "Dramatic impact, battle starts" },
  { id: "low-angle-dolly", label: "Low Angle Dolly", description: "Heroic framing" },
  { id: "rack-focus-pan", label: "Rack Focus Pan", description: "Mystery, environmental reveals" },
  { id: "static-wide", label: "Static Wide", description: "Melancholic, contemplative" },
];

const styles: { id: VideoStyle; label: string; description: string }[] = [
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
  const [selectedStyle, setSelectedStyle] = useState<VideoStyle | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('auto');
  const [motionIntensity, setMotionIntensity] = useState(DEFAULT_MOTION_INTENSITY);
  const [clipDuration, setClipDuration] = useState(DEFAULT_CLIP_DURATION);
  const [title, setTitle] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        {isPending ? (
          <span className="mb-4 inline-flex cursor-not-allowed items-center gap-1 text-sm text-zinc-300 dark:text-zinc-600" aria-disabled="true">
            <ChevronLeft className="h-4 w-4" />
            Back to Campaign
          </span>
        ) : (
          <Link
            href={`/campaigns/${campaignId}`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Campaign
          </Link>
        )}
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
        <div className="space-y-4">
          {/* Visual Style */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Visual Style
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

          {/* Camera Movement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Camera Movement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-zinc-500">
                Select a named camera move, or let the AI choose based on scene mood.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {cameraPresets.map((cp) => (
                  <button
                    key={cp.id}
                    onClick={() => setCameraPreset(cp.id)}
                    className={`flex items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                      cameraPreset === cp.id
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        cameraPreset === cp.id
                          ? "border-violet-600 bg-violet-600"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {cameraPreset === cp.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{cp.label}</p>
                      <p className="text-xs text-zinc-500">{cp.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Motion Intensity + Clip Duration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Motion Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Motion Intensity */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="motion-intensity" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Motion Intensity
                  </label>
                  <span className="text-xs text-zinc-500">
                    {motionIntensity <= 0.35 ? "Fluid / Creative" : motionIntensity >= 0.7 ? "Precise / Strict" : "Balanced"}
                  </span>
                </div>
                <input
                  id="motion-intensity"
                  type="range"
                  min={0.3}
                  max={0.8}
                  step={0.05}
                  value={motionIntensity}
                  onChange={(e) => setMotionIntensity(parseFloat(e.target.value))}
                  className="w-full accent-violet-600"
                />
                <div className="mt-1 flex justify-between text-xs text-zinc-400">
                  <span>Fluid</span>
                  <span>Balanced</span>
                  <span>Precise</span>
                </div>
              </div>

              {/* Clip Duration */}
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">Clip Duration</p>
                <div className="flex gap-3">
                  {[
                    { value: 5, label: "5 seconds", hint: "Focused, coherent motion" },
                    { value: 10, label: "10 seconds", hint: "More coverage, may drift" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setClipDuration(opt.value)}
                      className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
                        clipDuration === opt.value
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                      }`}
                    >
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{opt.label}</p>
                      <p className="text-xs text-zinc-500">{opt.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Review & Generate */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Collection title input */}
          <Card>
            <CardHeader><CardTitle>Video Collection Title</CardTitle></CardHeader>
            <CardContent>
              <label htmlFor="video-title" className="mb-1.5 block text-sm text-zinc-500">
                Give this video generation a name (e.g. &quot;Session 5 Highlights&quot;)
              </label>
              <input
                id="video-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title…"
                maxLength={120}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </CardContent>
          </Card>

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
                <p className="mb-2 text-sm font-medium text-zinc-500">
                  Selected Scenes ({selectedSceneIds.length}/{MAX_SCENES} max)
                  {selectedSceneIds.length > MAX_SCENES && (
                    <span className="ml-2 text-red-500">Too many selected — please deselect some</span>
                  )}
                </p>
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
                <p className="mb-2 text-sm font-medium text-zinc-500">Camera / Motion</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{cameraPresets.find((cp) => cp.id === cameraPreset)?.label ?? cameraPreset}</Badge>
                  <Badge variant="outline">
                    {motionIntensity <= 0.35 ? "Fluid" : motionIntensity >= 0.7 ? "Precise" : "Balanced"} intensity
                  </Badge>
                  <Badge variant="outline">{clipDuration}s clip</Badge>
                </div>
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

          {generateError && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400">
              {generateError}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1 || isPending}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        {step < 4 ? (
          <Button
            onClick={step === 1 ? goToStep2 : () => setStep((s) => s + 1)}
            disabled={(step === 1 && selectedTranscripts.length === 0) || (step === 3 && !selectedStyle)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            disabled={isPending || !selectedStyle || selectedSceneIds.length === 0 || selectedSceneIds.length > MAX_SCENES || !title.trim()}
            onClick={() => {
              setGenerateError(null);
              startTransition(async () => {
                const result = await generateVideo(
                  campaignId,
                  selectedSceneIds,
                  selectedStyle!,
                  title.trim(),
                  cameraPreset,
                  motionIntensity,
                  clipDuration
                );
                if (result?.error) {
                  setGenerateError(result.error);
                }
              });
            }}
          >
            <Wand2 className="h-4 w-4" />
            {isPending ? `Generating ${selectedSceneIds.length} clip${selectedSceneIds.length !== 1 ? 's' : ''}…` : 'Generate Videos'}
          </Button>
        )}
      </div>
    </div>
  );
}
