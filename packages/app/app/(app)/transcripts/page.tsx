import { ScrollText, Filter, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { getAllUserTranscripts } from "@/lib/queries/transcripts";
import { getUserCampaigns } from "@/lib/queries/campaigns";
import type { TranscriptStatus } from "@lore/shared";

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDate(sessionDate: string | null, createdAt: string): string {
  const raw = sessionDate ?? createdAt;
  return new Date(raw).toLocaleDateString();
}

function statusVariant(status: TranscriptStatus): "success" | "danger" | "warning" {
  if (status === "processed") return "success";
  if (status === "error") return "danger";
  return "warning";
}

export default async function TranscriptsPage() {
  const [transcripts, campaigns] = await Promise.all([
    getAllUserTranscripts(),
    getUserCampaigns(),
  ]);

  const campaignMap: Record<string, string> = {};
  for (const c of campaigns) {
    campaignMap[c.id] = c.name;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Transcripts</h1>
          <p className="mt-1 text-sm text-zinc-500">Session transcripts from Discord or uploaded manually.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <Link
            href="/transcripts/new"
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            <Plus className="h-4 w-4" />
            New Transcript
          </Link>
        </div>
      </div>

      {transcripts.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No transcripts yet"
          description="Transcripts are imported from Discord or can be uploaded manually from a campaign page."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-100 dark:border-zinc-800">
                <tr className="text-left text-xs font-medium text-zinc-500">
                  <th className="px-6 py-3">Session</th>
                  <th className="px-6 py-3">Campaign</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {transcripts.map((t) => {
                  const sessionLabel =
                    t.title
                      ? t.title
                      : t.session_number !== null
                      ? `Session ${t.session_number}`
                      : "—";
                  const campaignName = campaignMap[t.campaign_id] ?? "—";
                  return (
                    <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                        {sessionLabel}
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{campaignName}</td>
                      <td className="px-6 py-4 text-zinc-500">
                        {formatDate(t.session_date, t.created_at)}
                      </td>
                      <td className="px-6 py-4 text-zinc-500">
                        {formatDuration(t.duration_minutes)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{t.source}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/transcripts/${t.id}`}
                          className="text-violet-600 hover:underline dark:text-violet-400"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
