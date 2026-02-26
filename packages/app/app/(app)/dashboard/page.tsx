import Link from "next/link";
import { Sword, ScrollText, Video, Plus, Upload, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const stats = [
  { label: "Campaigns", value: "3", icon: Sword, color: "text-violet-600" },
  { label: "Transcripts", value: "12", icon: ScrollText, color: "text-blue-600" },
  { label: "Videos Generated", value: "5", icon: Video, color: "text-emerald-600" },
];

const recentActivity = [
  { type: "transcript", text: "Session 14 transcript imported", time: "2 hours ago", campaign: "Curse of Strahd" },
  { type: "video", text: "Video generated from Session 12", time: "1 day ago", campaign: "Curse of Strahd" },
  { type: "transcript", text: "Session 8 transcript imported", time: "3 days ago", campaign: "Waterdeep: Dragon Heist" },
  { type: "video", text: "Video generated from Session 7", time: "4 days ago", campaign: "Waterdeep: Dragon Heist" },
  { type: "transcript", text: "Session 3 transcript imported", time: "1 week ago", campaign: "Tomb of Annihilation" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Your campaign chronicle at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
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
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 border-b border-zinc-100 pb-4 last:border-0 last:pb-0 dark:border-zinc-800">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                      {item.type === "transcript"
                        ? <ScrollText className="h-4 w-4 text-blue-600" />
                        : <Video className="h-4 w-4 text-emerald-600" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.text}</p>
                      <p className="text-xs text-zinc-500">{item.campaign} · {item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
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
                href="/campaigns"
                className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Plus className="h-4 w-4" />
                New Campaign
              </Link>
              <Link
                href="/transcripts"
                className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Upload className="h-4 w-4" />
                Upload Transcript
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
