import Link from "next/link";
import { Sword, ScrollText, Video, Plus, Upload, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { getAllUserTranscripts } from "@/lib/queries/transcripts";
import { getUserCampaigns } from "@/lib/queries/campaigns";

export default async function DashboardPage() {
  const [stats, transcripts, campaigns] = await Promise.all([
    getDashboardStats(),
    getAllUserTranscripts(),
    getUserCampaigns(),
  ]);

  const campaignMap: Record<string, string> = {};
  for (const c of campaigns) {
    campaignMap[c.id] = c.name;
  }

  const statCards = [
    { label: "Campaigns", value: String(stats.campaignCount), icon: Sword, color: "text-violet-600" },
    { label: "Transcripts", value: String(stats.transcriptCount), icon: ScrollText, color: "text-blue-600" },
    { label: "Videos Generated", value: String(stats.videoCount), icon: Video, color: "text-emerald-600" },
  ];

  const recentTranscripts = transcripts.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Your campaign chronicle at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
                <p className="text-sm text-zinc-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Transcripts */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transcripts</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTranscripts.length === 0 ? (
                <p className="text-sm text-zinc-400">No transcripts yet.</p>
              ) : (
                <div className="space-y-4">
                  {recentTranscripts.map((t) => {
                    const label = t.title || (t.session_number !== null ? `Session ${t.session_number}` : "Untitled");
                    const campaignName = campaignMap[t.campaign_id] ?? "—";
                    const date = new Date(t.session_date ?? t.created_at).toLocaleDateString();
                    return (
                      <div key={t.id} className="flex items-start gap-3 border-b border-zinc-100 pb-4 last:border-0 last:pb-0 dark:border-zinc-800">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <ScrollText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link href={`/transcripts/${t.id}`} className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                            {label}
                          </Link>
                          <p className="text-xs text-zinc-500">{campaignName} · {date}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/campaigns/new"
                className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Plus className="h-4 w-4" />
                New Campaign
              </Link>
              <Link
                href="/transcripts/new"
                className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Upload className="h-4 w-4" />
                New Transcript
              </Link>
              <Link
                href="/campaigns"
                className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Wand2 className="h-4 w-4" />
                Generate Video
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
