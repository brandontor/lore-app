'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Ghost, Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { NpcForm } from './NpcForm';
import { createNpc, updateNpc, deleteNpc, updateNpcImage } from '@/lib/actions/npcs';
import { createClient } from '@/lib/supabase/client';
import type { NPC } from '@lore/shared';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface NpcsTabProps {
  campaignId: string;
  npcs: NPC[];
  canWrite: boolean;
}

export function NpcsTab({ campaignId, npcs: initial, canWrite }: NpcsTabProps) {
  const router = useRouter();
  const [npcs, setNpcs] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{ id: string; message: string } | null>(null);
  const [, startTransition] = useTransition();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleCreate(formData: FormData) {
    const result = await createNpc(campaignId, formData);
    if (result?.error) return result;
    setShowCreate(false);
    router.refresh();
    return result;
  }

  async function handleUpdate(npcId: string, formData: FormData) {
    const result = await updateNpc(npcId, formData);
    if (result?.error) return result;
    setEditingId(null);
    router.refresh();
    return result;
  }

  function handleDelete(npcId: string, npcName: string) {
    if (!window.confirm(`Delete ${npcName}? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteNpc(npcId);
      if (!result?.error) {
        delete fileInputRefs.current[npcId];
        setNpcs((prev) => prev.filter((n) => n.id !== npcId));
      }
    });
  }

  async function handleImageUpload(npc: NPC, file: File) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError({ id: npc.id, message: 'Only JPEG, PNG, WebP, and GIF images are allowed' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError({ id: npc.id, message: 'Image must be 2MB or smaller' });
      return;
    }

    setUploadingId(npc.id);
    setUploadError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploadError({ id: npc.id, message: 'Your session has expired — please refresh and try again.' });
      setUploadingId(null);
      return;
    }

    const path = `${user.id}/${npc.id}/portrait`;

    const { error: uploadErr } = await supabase.storage
      .from('npc-portraits')
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      const isAuthError =
        uploadErr.message.toLowerCase().includes('unauthorized') ||
        uploadErr.message.toLowerCase().includes('jwt') ||
        (uploadErr as { status?: number }).status === 401;
      setUploadError({
        id: npc.id,
        message: isAuthError
          ? 'Your session has expired — please refresh and try again.'
          : uploadErr.message,
      });
      setUploadingId(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('npc-portraits')
      .getPublicUrl(path);

    const result = await updateNpcImage(npc.id, publicUrl);
    if (result?.error) {
      setUploadError({ id: npc.id, message: result.error });
    } else {
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
            Add NPC
          </button>
        </div>
      )}

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>New NPC</CardTitle></CardHeader>
          <CardContent>
            <NpcForm
              action={handleCreate}
              submitLabel="Create NPC"
              onCancel={() => setShowCreate(false)}
            />
          </CardContent>
        </Card>
      )}

      {npcs.length === 0 && !showCreate ? (
        <EmptyState
          icon={Ghost}
          title="No NPCs yet"
          description={canWrite ? "Add NPCs to populate your world." : "NPCs will appear here once added."}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {npcs.map((npc) => (
            <Card key={npc.id}>
              <CardContent>
                {editingId === npc.id ? (
                  <NpcForm
                    action={(fd) => handleUpdate(npc.id, fd)}
                    defaultValues={{
                      name: npc.name,
                      role: npc.role ?? undefined,
                      description: npc.description ?? undefined,
                      appearance: npc.appearance ?? undefined,
                    }}
                    submitLabel="Save"
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          {npc.image_url ? (
                            <img
                              src={npc.image_url}
                              alt={npc.name}
                              loading="lazy"
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <Ghost className="h-5 w-5 text-zinc-500" />
                          )}
                        </div>
                        {canWrite && (
                          <>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              ref={(el) => { fileInputRefs.current[npc.id] = el; }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(npc, file);
                                e.target.value = '';
                              }}
                            />
                            <button
                              onClick={() => fileInputRefs.current[npc.id]?.click()}
                              disabled={uploadingId === npc.id}
                              className="flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-violet-500 disabled:opacity-50"
                            >
                              <Upload className="h-3 w-3" />
                              {uploadingId === npc.id ? 'Uploading…' : 'Portrait'}
                            </button>
                          </>
                        )}
                      </div>
                      {canWrite && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingId(npc.id)}
                            className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                            aria-label="Edit NPC"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(npc.id, npc.name)}
                            className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                            aria-label="Delete NPC"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{npc.name}</h3>
                    {npc.role && (
                      <p className="text-sm text-zinc-500">{npc.role}</p>
                    )}
                    {npc.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{npc.description}</p>
                    )}
                    {uploadError?.id === npc.id && (
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
