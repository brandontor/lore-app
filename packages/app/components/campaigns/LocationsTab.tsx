'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LocationForm } from './LocationForm';
import { createLocation, updateLocation, deleteLocation, updateLocationImage } from '@/lib/actions/locations';
import { createClient } from '@/lib/supabase/client';
import type { Location } from '@lore/shared';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface LocationsTabProps {
  campaignId: string;
  locations: Location[];
  canWrite: boolean;
}

export function LocationsTab({ campaignId, locations: initial, canWrite }: LocationsTabProps) {
  const router = useRouter();
  const [locations, setLocations] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{ id: string; message: string } | null>(null);
  const [, startTransition] = useTransition();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleCreate(formData: FormData) {
    const result = await createLocation(campaignId, formData);
    if (result?.error) return result;
    setShowCreate(false);
    router.refresh();
    return result;
  }

  async function handleUpdate(locationId: string, formData: FormData) {
    const result = await updateLocation(locationId, formData);
    if (result?.error) return result;
    setEditingId(null);
    router.refresh();
    return result;
  }

  function handleDelete(locationId: string, locationName: string) {
    if (!window.confirm(`Delete ${locationName}? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteLocation(locationId);
      if (!result?.error) {
        delete fileInputRefs.current[locationId];
        setLocations((prev) => prev.filter((l) => l.id !== locationId));
      }
    });
  }

  async function handleImageUpload(location: Location, file: File) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError({ id: location.id, message: 'Only JPEG, PNG, WebP, and GIF images are allowed' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError({ id: location.id, message: 'Image must be 2MB or smaller' });
      return;
    }

    setUploadingId(location.id);
    setUploadError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploadError({ id: location.id, message: 'Your session has expired — please refresh and try again.' });
      setUploadingId(null);
      return;
    }

    const path = `${user.id}/${location.id}/portrait`;

    const { error: uploadErr } = await supabase.storage
      .from('location-images')
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      const isAuthError =
        uploadErr.message.toLowerCase().includes('unauthorized') ||
        uploadErr.message.toLowerCase().includes('jwt') ||
        (uploadErr as { status?: number }).status === 401;
      setUploadError({
        id: location.id,
        message: isAuthError
          ? 'Your session has expired — please refresh and try again.'
          : uploadErr.message,
      });
      setUploadingId(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('location-images')
      .getPublicUrl(path);

    const result = await updateLocationImage(location.id, publicUrl);
    if (result?.error) {
      setUploadError({ id: location.id, message: result.error });
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
            Add Location
          </button>
        </div>
      )}

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>New Location</CardTitle></CardHeader>
          <CardContent>
            <LocationForm
              action={handleCreate}
              submitLabel="Create Location"
              onCancel={() => setShowCreate(false)}
            />
          </CardContent>
        </Card>
      )}

      {locations.length === 0 && !showCreate ? (
        <EmptyState
          icon={MapPin}
          title="No locations yet"
          description={canWrite ? "Add locations to map your world." : "Locations will appear here once added."}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <Card key={loc.id}>
              <CardContent>
                {editingId === loc.id ? (
                  <LocationForm
                    action={(fd) => handleUpdate(loc.id, fd)}
                    defaultValues={{
                      name: loc.name,
                      type: loc.type ?? undefined,
                      description: loc.description ?? undefined,
                    }}
                    submitLabel="Save"
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          {loc.image_url ? (
                            <img
                              src={loc.image_url}
                              alt={loc.name}
                              loading="lazy"
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <MapPin className="h-5 w-5 text-zinc-500" />
                          )}
                        </div>
                        {canWrite && (
                          <>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              ref={(el) => { fileInputRefs.current[loc.id] = el; }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(loc, file);
                                e.target.value = '';
                              }}
                            />
                            <button
                              onClick={() => fileInputRefs.current[loc.id]?.click()}
                              disabled={uploadingId === loc.id}
                              className="flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-violet-500 disabled:opacity-50"
                            >
                              <Upload className="h-3 w-3" />
                              {uploadingId === loc.id ? 'Uploading…' : 'Image'}
                            </button>
                          </>
                        )}
                      </div>
                      {canWrite && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingId(loc.id)}
                            className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                            aria-label="Edit location"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(loc.id, loc.name)}
                            className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                            aria-label="Delete location"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{loc.name}</h3>
                    {loc.type && (
                      <p className="text-sm capitalize text-zinc-500">{loc.type}</p>
                    )}
                    {loc.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{loc.description}</p>
                    )}
                    {uploadError?.id === loc.id && (
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
