import { ScrollText, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

const transcripts = [
  { id: "1", session: "Session 14", campaign: "Curse of Strahd", date: "Feb 18, 2026", duration: "3h 42m", source: "Discord", status: "processed" },
  { id: "2", session: "Session 13", campaign: "Curse of Strahd", date: "Feb 11, 2026", duration: "4h 10m", source: "Discord", status: "processed" },
  { id: "3", session: "Session 12", campaign: "Curse of Strahd", date: "Feb 4, 2026", duration: "3h 55m", source: "Discord", status: "processed" },
  { id: "4", session: "Session 8", campaign: "Waterdeep: Dragon Heist", date: "Jan 20, 2026", duration: "2h 50m", source: "Discord", status: "processed" },
  { id: "5", session: "Session 7", campaign: "Waterdeep: Dragon Heist", date: "Jan 13, 2026", duration: "3h 15m", source: "Discord", status: "processed" },
  { id: "6", session: "Session 3", campaign: "Tomb of Annihilation", date: "Dec 30, 2025", duration: "4h 05m", source: "Discord", status: "pending" },
];

export default function TranscriptsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Transcripts</h1>
          <p className="mt-1 text-sm text-zinc-500">Session transcripts imported from Discord.</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900">
          <Filter className="h-4 w-4" />
          Filter by Campaign
        </button>
      </div>

      {transcripts.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No transcripts yet"
          description="Transcripts are automatically imported from your Discord bot sessions."
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
                {transcripts.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{t.session}</td>
                    <td className="px-6 py-4 text-zinc-500">{t.campaign}</td>
                    <td className="px-6 py-4 text-zinc-500">{t.date}</td>
                    <td className="px-6 py-4 text-zinc-500">{t.duration}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">{t.source}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={t.status === "processed" ? "success" : "warning"}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/transcripts/${t.id}`} className="text-violet-600 hover:underline dark:text-violet-400">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
