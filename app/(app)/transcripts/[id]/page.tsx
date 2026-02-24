import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Sword, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getTranscriptById } from "@/lib/queries/transcripts";
import { getCampaignById } from "@/lib/queries/campaigns";
import type { TranscriptStatus } from "@/lib/types";

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

export default async function TranscriptViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const transcript = await getTranscriptById(id);
  if (!transcript) notFound();

  const campaign = await getCampaignById(transcript.campaign_id);
  const campaignName = campaign?.name ?? transcript.campaign_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/transcripts"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Transcripts
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {transcript.title}
              </h1>
              <Badge variant={statusVariant(transcript.status)}>{transcript.status}</Badge>
            </div>
            <p className="text-sm text-zinc-500">{campaignName}</p>
          </div>
          <Button variant="secondary">Assign to Campaign</Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transcript text */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Session Transcript</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[600px] overflow-y-auto rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {transcript.content}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metadata sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Session Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500">Date</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatDate(transcript.session_date, transcript.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500">Duration</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatDuration(transcript.duration_minutes)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Sword className="h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500">Campaign</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{campaignName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Source</CardTitle></CardHeader>
            <CardContent>
              <Badge variant="outline">{transcript.source}</Badge>
              <p className="mt-2 text-xs text-zinc-500">
                Automatically imported via the Lore Discord bot.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
