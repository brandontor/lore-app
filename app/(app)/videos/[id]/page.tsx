import Link from "next/link";
import { ChevronLeft, Video, Download, Share2, Calendar, Sword, ScrollText, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default async function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: _id } = await params;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/videos"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Videos
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              The Siege of Barovia — Session 12
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Curse of Strahd</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Video player */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="flex aspect-video items-center justify-center rounded-t-lg bg-zinc-900">
                <div className="text-center">
                  <Video className="mx-auto mb-3 h-16 w-16 text-zinc-600" />
                  <p className="text-sm text-zinc-500">Video player coming soon</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-3 dark:border-zinc-800">
                <div className="flex items-center gap-3 text-sm text-zinc-500">
                  <span>2:34</span>
                  <span>·</span>
                  <span>Feb 6, 2026</span>
                </div>
                <Button size="sm" variant="secondary">
                  <Download className="h-4 w-4" />
                  Download MP4
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metadata */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Video Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500">Generated</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">Feb 6, 2026</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Sword className="h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500">Campaign</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">Curse of Strahd</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Palette className="h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500">Style</p>
                  <Badge variant="outline">Cinematic</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Source Transcripts</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { session: "Session 12", date: "Feb 4, 2026", id: "3" },
              ].map((t) => (
                <Link
                  key={t.id}
                  href={`/transcripts/${t.id}`}
                  className="flex items-center gap-2 rounded-lg p-2 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <ScrollText className="h-4 w-4 shrink-0 text-zinc-400" />
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{t.session}</p>
                    <p className="text-xs text-zinc-500">{t.date}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Share</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                <span className="flex-1 truncate text-xs text-zinc-500">
                  Share links — coming soon
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
