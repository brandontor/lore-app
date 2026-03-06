'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CharacterForm } from './CharacterForm';
import { createCharacter, updateCharacter, deleteCharacter, updateCharacterPortrait } from '@/lib/actions/characters';
import { createClient } from '@/lib/supabase/client';
import type { Character } from '@lore/shared';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{ id: string; message: string } | null>(null);
  const [, startTransition] = useTransition();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
      const result = await deleteCharacter(characterId);
      if (!result?.error) {
        delete fileInputRefs.current[characterId];
        setCharacters((prev) => prev.filter((c) => c.id !== characterId));
      }
    });
  }

  async function handlePortraitUpload(char: Character, file: File) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError({ id: char.id, message: 'Only JPEG, PNG, WebP, and GIF images are allowed' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError({ id: char.id, message: 'Image must be 2MB or smaller' });
      return;
    }

    setUploadingId(char.id);
    setUploadError(null);

    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploadError({ id: char.id, message: 'Your session has expired — please refresh and try again.' });
      setUploadingId(null);
      return;
    }

    // Path: {userId}/{charId}/portrait — deterministic, no orphaned files, matches storage RLS
    const path = `${user.id}/${char.id}/portrait`;

    const { error: uploadErr } = await supabase.storage
      .from('character-portraits')
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      const isAuthError =
        uploadErr.message.toLowerCase().includes('unauthorized') ||
        uploadErr.message.toLowerCase().includes('jwt') ||
        (uploadErr as { status?: number }).status === 401;
      setUploadError({
        id: char.id,
        message: isAuthError
          ? 'Your session has expired — please refresh and try again.'
          : uploadErr.message,
      });
      setUploadingId(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('character-portraits')
      .getPublicUrl(path);

    const result = await updateCharacterPortrait(char.id, publicUrl);
    if (result?.error) {
      setUploadError({ id: char.id, message: result.error });
    } else {
      setCharacters((prev) => prev.map((c) => c.id === char.id ? { ...c, portrait_url: publicUrl } : c));
      router.refresh();
    }
    setUploadingId(null);
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
                    defaultValues={{
                      name: char.name,
                      class: char.class ?? undefined,
                      race: char.race ?? undefined,
                      level: char.level,
                      appearance: char.appearance ?? undefined,
                      backstory: char.backstory ?? undefined,
                    }}
                    submitLabel="Save"
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          {char.portrait_url ? (
                            <img
                              src={char.portrait_url}
                              alt={char.name}
                              loading="lazy"
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-zinc-500" />
                          )}
                        </div>
                        {canWrite && (
                          <>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              ref={(el) => { fileInputRefs.current[char.id] = el; }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePortraitUpload(char, file);
                                e.target.value = '';
                              }}
                            />
                            <button
                              onClick={() => fileInputRefs.current[char.id]?.click()}
                              disabled={uploadingId === char.id}
                              className="flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-violet-500 disabled:opacity-50"
                            >
                              <Upload className="h-3 w-3" />
                              {uploadingId === char.id ? 'Uploading…' : 'Portrait'}
                            </button>
                          </>
                        )}
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
                    {char.appearance && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{char.appearance}</p>
                    )}
                    {uploadError?.id === char.id && (
                      <p className="mt-1 text-xs text-red-400">{uploadError.message}</p>
                    )}
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
