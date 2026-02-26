'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { User, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CharacterForm } from './CharacterForm';
import { createCharacter, updateCharacter, deleteCharacter } from '@/lib/actions/characters';
import type { Character } from '@lore/shared';

interface CharactersTabProps {
  campaignId: string;
  characters: Character[];
  canWrite: boolean;
}

export function CharactersTab({ campaignId, characters: initial, canWrite }: CharactersTabProps) {
  const router = useRouter();
  const [characters, setCharacters] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleCreate(formData: FormData) {
    const result = await createCharacter(campaignId, formData);
    if (result?.error) return result;
    setShowCreate(false);
    router.refresh();
    return result;
  }

  async function handleUpdate(characterId: string, formData: FormData) {
    const result = await updateCharacter(characterId, formData);
    if (result?.error) return result;
    setEditingId(null);
    router.refresh();
    return result;
  }

  function handleDelete(characterId: string, characterName: string) {
    if (!window.confirm(`Delete ${characterName}? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteCharacter(characterId);
      setCharacters((prev) => prev.filter((c) => c.id !== characterId));
    });
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            <Plus className="h-4 w-4" />
            Add Character
          </button>
        </div>
      )}

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>New Character</CardTitle></CardHeader>
          <CardContent>
            <CharacterForm
              action={handleCreate}
              submitLabel="Create Character"
              onCancel={() => setShowCreate(false)}
            />
          </CardContent>
        </Card>
      )}

      {characters.length === 0 && !showCreate ? (
        <EmptyState
          icon={User}
          title="No characters yet"
          description={canWrite ? "Add your party members to get started." : "Characters will appear here once added."}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((char) => (
            <Card key={char.id}>
              <CardContent>
                {editingId === char.id ? (
                  <CharacterForm
                    action={(fd) => handleUpdate(char.id, fd)}
                    defaultValues={{ name: char.name, class: char.class ?? undefined, race: char.race ?? undefined, level: char.level }}
                    submitLabel="Save"
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <User className="h-5 w-5 text-zinc-500" />
                      </div>
                      {canWrite && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingId(char.id)}
                            className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                            aria-label="Edit character"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(char.id, char.name)}
                            className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                            aria-label="Delete character"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{char.name}</h3>
                    <p className="text-sm text-zinc-500">
                      Level {char.level}
                      {char.race ? ` ${char.race}` : ''}
                      {char.class ? ` ${char.class}` : ''}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
