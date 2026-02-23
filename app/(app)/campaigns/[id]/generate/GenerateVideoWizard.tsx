"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ScrollText, Palette, Wand2, Check, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const steps = [
  { id: 1, label: "Select Transcripts" },
  { id: 2, label: "Style & Tone" },
  { id: 3, label: "Review & Generate" },
];

const transcripts = [
  { id: "1", session: "Session 14", date: "Feb 18, 2026", duration: "3h 42m" },
  { id: "2", session: "Session 13", date: "Feb 11, 2026", duration: "4h 10m" },
  { id: "3", session: "Session 12", date: "Feb 4, 2026", duration: "3h 55m" },
  { id: "4", session: "Session 11", date: "Jan 28, 2026", duration: "3h 20m" },
];

const styles = [
  { id: "cinematic", label: "Cinematic", description: "Epic fantasy film aesthetic — dramatic lighting, sweeping vistas" },
  { id: "anime", label: "Anime", description: "Japanese animation style with expressive characters and vibrant colors" },
  { id: "painterly", label: "Painterly", description: "Digital oil painting reminiscent of classic fantasy book covers" },
  { id: "dark-fantasy", label: "Dark Fantasy", description: "Gritty, atmospheric visuals inspired by dark high fantasy art" },
];

export function GenerateVideoWizard({ campaignId }: { campaignId: string }) {
  const [step, setStep] = useState(1);
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  function toggleTranscript(id: string) {
    setSelectedTranscripts((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

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
      <div className="flex items-center gap-2">
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
            {transcripts.map((t) => (
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
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{t.session}</p>
                  <p className="text-sm text-zinc-500">{t.date} · {t.duration}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Style & Tone */}
      {step === 2 && (
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

      {/* Step 3: Review & Generate */}
      {step === 3 && (
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
                        .map((t) => <Badge key={t.id}>{t.session}</Badge>)
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
        {step < 3 ? (
          <Button onClick={() => setStep((s) => s + 1)}>
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
