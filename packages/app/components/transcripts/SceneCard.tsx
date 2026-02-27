'use client';

import { useState, useTransition } from 'react';
import { Clock } from 'lucide-react';
import { toggleSceneSelection } from '@/lib/actions/transcripts';
import type { TranscriptScene, SceneMood } from '@lore/shared';

const moodStyles: Record<SceneMood, string> = {
  tense:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  triumphant:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  mysterious:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  dramatic:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  comedic:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  melancholic: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

interface SceneCardProps {
  scene: TranscriptScene;
  canWrite: boolean;
  onToggle?: (id: string, selected: boolean) => void;
}

export function SceneCard({ scene, canWrite, onToggle }: SceneCardProps) {
  const [selected, setSelected] = useState(scene.selected_for_video);
  const [, startTransition] = useTransition();

  function handleToggle() {
    if (!canWrite) return;
    const next = !selected;
    setSelected(next);
    onToggle?.(scene.id, next);
    startTransition(async () => {
      const result = await toggleSceneSelection(scene.id, next);
      if (result?.error) {
        // Revert on error
        setSelected(!next);
        onToggle?.(scene.id, !next);
      }
    });
  }

  const confidenceColor =
    scene.confidence_score >= 0.75
      ? 'bg-green-500'
      : scene.confidence_score >= 0.5
      ? 'bg-amber-500'
      : 'bg-red-500';

  const previewLines = scene.raw_speaker_lines.slice(0, 3);
  const extraCount = scene.raw_speaker_lines.length - previewLines.length;
  const hasTimestamps = scene.start_timestamp || scene.end_timestamp;

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        selected
          ? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/20'
          : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/50'
      }`}
    >
      {/* Header row */}
      <div className="mb-2 flex items-start gap-3">
        {canWrite && (
          <button
            onClick={handleToggle}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
              selected
                ? 'border-violet-600 bg-violet-600'
                : 'border-zinc-300 dark:border-zinc-600'
            }`}
            aria-label={selected ? 'Deselect scene' : 'Select scene'}
          >
            {selected && (
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{scene.title}</h4>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${moodStyles[scene.mood]}`}>
              {scene.mood}
            </span>
          </div>
          {hasTimestamps && (
            <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
              <Clock className="h-3 w-3" />
              {scene.start_timestamp ?? '?'}
              {scene.end_timestamp ? ` – ${scene.end_timestamp}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{scene.description}</p>

      {/* Dialogue preview */}
      {previewLines.length > 0 && (
        <div className="mb-3 rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-2">
          {previewLines.map((line, i) => (
            <p key={i} className="font-mono text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {line}
            </p>
          ))}
          {extraCount > 0 && (
            <p className="mt-1 text-xs text-zinc-400">+{extraCount} more line{extraCount !== 1 ? 's' : ''}</p>
          )}
        </div>
      )}

      {/* Confidence bar */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className={`h-1.5 rounded-full ${confidenceColor}`}
            style={{ width: `${Math.round(scene.confidence_score * 100)}%` }}
          />
        </div>
        <span className="text-xs text-zinc-400">{Math.round(scene.confidence_score * 100)}%</span>
      </div>
    </div>
  );
}
