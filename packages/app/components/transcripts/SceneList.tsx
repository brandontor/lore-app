'use client';

import { useState } from 'react';
import { SceneCard } from './SceneCard';
import type { TranscriptScene } from '@lore/shared';

interface SceneListProps {
  initialScenes: TranscriptScene[];
  canWrite: boolean;
}

export function SceneList({ initialScenes, canWrite }: SceneListProps) {
  const [scenes, setScenes] = useState(initialScenes);

  function handleToggle(id: string, selected: boolean) {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected_for_video: selected } : s))
    );
  }

  return (
    <div className="space-y-3">
      {scenes.map((scene) => (
        <SceneCard
          key={scene.id}
          scene={scene}
          canWrite={canWrite}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}
