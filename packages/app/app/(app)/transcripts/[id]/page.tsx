import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Sword, Calendar, Clock, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getTranscriptById, getSpeakerMappingsByCampaign, getScenesByTranscript } from "@/lib/queries/transcripts";
import { getCampaignById } from "@/lib/queries/campaigns";
import { getCharactersByCampaign } from "@/lib/queries/characters";
import { SpeakerMappingPanel } from "@/components/transcripts/SpeakerMappingPanel";
import { DeleteTranscriptButton } from "@/components/transcripts/DeleteTranscriptButton";
import { GenerateSummaryButton } from "@/components/transcripts/GenerateSummaryButton";
import { ExtractScenesButton } from "@/components/transcripts/ExtractScenesButton";
import { SceneList } from "@/components/transcripts/SceneList";
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

export default async function TranscriptViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const transcript = await getTranscriptById(id);
  if (!transcript) notFound();

  const [campaign, characters, speakerMappings, scenes] = await Promise.all([
    getCampaignById(transcript.campaign_id),
    getCharactersByCampaign(transcript.campaign_id),
    getSpeakerMappingsByCampaign(transcript.campaign_id),
    getScenesByTranscript(id),
  ]);

  if (!campaign) notFound();

  const canWrite = campaign.userRole === 'owner' || campaign.userRole === 'write';

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
                {transcript.title
                  ? transcript.title
                  : transcript.session_number !== null
                  ? `Session ${transcript.session_number}`
                  : "—"}
              </h1>
              <Badge variant={statusVariant(transcript.status)}>{transcript.status}</Badge>
            </div>
            <p className="text-sm text-zinc-500">{campaign.name}</p>
          </div>
          {canWrite && (
            <div className="flex items-center gap-2">
              <Link href={`/transcripts/${id}/edit`}>
                <Button variant="secondary">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <DeleteTranscriptButton transcriptId={id} />
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transcript text + speaker mappings */}
        <div className="space-y-6 lg:col-span-2">
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

          <SpeakerMappingPanel
            transcript={transcript}
            characters={characters}
            initialMappings={speakerMappings}
            canWrite={canWrite}
            campaignId={transcript.campaign_id}
          />
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
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{campaign.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Source</CardTitle></CardHeader>
            <CardContent>
              <Badge variant="outline">{transcript.source}</Badge>
              <p className="mt-2 text-xs text-zinc-500">
                {transcript.source === 'manual'
                  ? 'Manually uploaded via the web app.'
                  : 'Automatically imported via the Lore Discord bot.'}
              </p>
            </CardContent>
          </Card>

          {/* AI Summary */}
          <Card>
            <CardHeader><CardTitle>AI Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {transcript.summary ? (
                <div
                  className="prose prose-sm prose-zinc dark:prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(transcript.summary) }}
                />
              ) : (
                <p className="text-xs text-zinc-500">
                  No summary yet. Generate one to get key events, character moments, and a cliffhanger recap.
                </p>
              )}
              {canWrite && (
                <GenerateSummaryButton
                  transcriptId={id}
                  hasSummary={!!transcript.summary}
                />
              )}
            </CardContent>
          </Card>

          {/* Extracted Scenes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Extracted Scenes</span>
                {scenes.length > 0 && (
                  <span className="text-xs font-normal text-zinc-500">
                    {scenes.filter(s => s.selected_for_video).length}/{scenes.length} selected
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {scenes.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  No scenes extracted yet. Extract scenes to identify key moments for video generation.
                </p>
              ) : (
                <SceneList initialScenes={scenes} canWrite={canWrite} />
              )}
              {canWrite && (
                <ExtractScenesButton
                  transcriptId={id}
                  campaignId={transcript.campaign_id}
                  hasScenes={scenes.length > 0}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal Markdown → HTML for summary display (headings, bullets, bold).
 * XSS-safe: all user content is entity-escaped before any regex substitution,
 * so capture groups only re-insert already-escaped text into tags with no attributes.
 */
function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^## (.+)$/gm, '<h3 class="mt-4 mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="mt-4 mb-1 text-base font-bold text-zinc-900 dark:text-zinc-100">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-zinc-600 dark:text-zinc-400">$1</li>')
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-1 space-y-0.5">$1</ul>')
    .replace(/\n\n/g, '<br />');
}
