const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export function getStorageUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/campaign-videos/${storagePath}`;
}

export function formatStyle(style: string): string {
  return style
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
