import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { api } from "../api/client";

type TimeRow = {
  id: number;
  time_ms: number;
  penalty_ms: number;
  stage: number | null;
  racer_id: number | null;
  racer_name?: string | null;
  car_number?: string | null;
  category?: string | null;
  created_at: string;
};

type GroupedEntry = {
  racer_id: number;
  racer_name: string;
  car_number: string | null;
  category: string;
  stages: { [stage: number]: number };
  penalties: { [stage: number]: number };
};

export default function EventTimingPage() {
  const { eventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") || "live").toLowerCase();
  const activeTab: "live" | "results" = tab === "results" ? "results" : "live";

  const [rows, setRows] = useState<TimeRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  async function fetchData() {
    const data = await api<TimeRow[]>(`/api/events/${eventId}/times`);
    setRows(data);
    setLastUpdated(Date.now());
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const liveRows = useMemo(
    () => rows.filter((r) => r.stage !== null && r.racer_id !== null),
    [rows]
  );

  const latest = liveRows[0];

  const formatTime = (ms: number) => {
    if (!ms) return "—";
    if (ms >= 480000) return "Abandon";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${minutes}m ${seconds}s ${millis}ms`;
  };

  const latestFinal = useMemo(() => {
    if (!latest) return null;
    return latest.time_ms + (latest.penalty_ms || 0);
  }, [latest]);

  // --- RESULTS LOGIC (same as your Results page, but computed from rows) ---
  const groupedByCategory = useMemo(() => {
    const grouped: { [racerId: number]: GroupedEntry } = {};

    for (const entry of rows) {
      if (entry.stage === null) continue;
      if (!entry.racer_id) continue; // skip unassigned

      if (!grouped[entry.racer_id]) {
        grouped[entry.racer_id] = {
          racer_id: entry.racer_id,
          racer_name: entry.racer_name || `#${entry.racer_id}`,
          car_number: entry.car_number ?? null,
          category: entry.category || "Uncategorized",
          stages: {},
          penalties: {},
        };
      }
      grouped[entry.racer_id].stages[entry.stage] = entry.time_ms;
      grouped[entry.racer_id].penalties[entry.stage] = entry.penalty_ms;
    }

    const byCat: { [category: string]: GroupedEntry[] } = {};
    for (const racer of Object.values(grouped)) {
      if (!byCat[racer.category]) byCat[racer.category] = [];
      byCat[racer.category].push(racer);
    }

    // General leaderboard across all categories
    byCat["General"] = Object.values(grouped);

    const bestTotal = (e: GroupedEntry) => {
      const s1 = (e.stages[1] ?? 0) + (e.penalties[1] ?? 0);
      const s2 = (e.stages[2] ?? 0) + (e.penalties[2] ?? 0);
      const normalize = (t: number) => (!t || t >= 480000 ? Number.POSITIVE_INFINITY : t);
      return Math.min(normalize(s1), normalize(s2));
    };

    for (const c of Object.keys(byCat)) {
      byCat[c].sort((a, b) => {
        const ta = bestTotal(a);
        const tb = bestTotal(b);
        if (ta === tb) {
          const aNum = a.car_number ? parseInt(a.car_number, 10) : Number.POSITIVE_INFINITY;
          const bNum = b.car_number ? parseInt(b.car_number, 10) : Number.POSITIVE_INFINITY;
          const byNum = aNum - bNum;
          if (byNum !== 0) return byNum;
          return a.racer_name.localeCompare(b.racer_name);
        }
        return ta - tb;
      });
    }

    return byCat;
  }, [rows]);

  const categories = useMemo(() => {
    const keys = Object.keys(groupedByCategory);
    if (keys.includes("General")) {
      return ["General", ...keys.filter((k) => k !== "General")];
    }
    return keys;
  }, [groupedByCategory]);

  useEffect(() => {
    if (activeTab !== "results") return;
    if (!activeCategory && categories.length > 0) setActiveCategory(categories[0]);
    if (activeCategory && !categories.includes(activeCategory)) setActiveCategory(categories[0] || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, categories.join("|")]);

  const exportCategoryToPDF = (category: string, racers: GroupedEntry[]) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Timing Results", 14, 18);

    const isGeneral = category === "General";

    const tableColumn = isGeneral
      ? ["Pilot", "#", "Category", "M1", "Pen1", "Total1", "M2", "Pen2", "Total2", "Best"]
      : ["Pilot", "#", "M1", "Pen1", "Total1", "M2", "Pen2", "Total2", "Best"];

    const tableRows = racers.map((entry) => {
      const stage1 = (entry.stages[1] || 0) + (entry.penalties[1] || 0);
      const stage2 = (entry.stages[2] || 0) + (entry.penalties[2] || 0);

      let best = 0;
      if (stage1 > 0 && stage2 > 0) best = Math.min(stage1, stage2);
      else if (stage1 > 0) best = stage1;
      else if (stage2 > 0) best = stage2;

      return isGeneral
        ? [
            entry.racer_name,
            entry.car_number || "-",
            entry.category,
            formatTime(entry.stages[1] || 0),
            formatTime(entry.penalties[1] || 0),
            formatTime(stage1),
            formatTime(entry.stages[2] || 0),
            formatTime(entry.penalties[2] || 0),
            formatTime(stage2),
            formatTime(best),
          ]
        : [
            entry.racer_name,
            entry.car_number || "-",
            formatTime(entry.stages[1] || 0),
            formatTime(entry.penalties[1] || 0),
            formatTime(stage1),
            formatTime(entry.stages[2] || 0),
            formatTime(entry.penalties[2] || 0),
            formatTime(stage2),
            formatTime(best),
          ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: "grid",
      styles: { fontSize: 8 },
    });

    doc.save(`event_${eventId}_${category}.pdf`);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-400">Event</div>
            <div className="text-xl font-semibold">Timing</div>
            <div className="text-xs text-neutral-500 mt-1">
              {lastUpdated ? `Updated ${Math.floor((Date.now() - lastUpdated) / 1000)}s ago` : "—"}
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              to="/app"
              className="px-4 py-2 rounded border border-neutral-800 hover:bg-neutral-900"
            >
              Back
            </Link>
            <Link
              to={`/app/events/${eventId}/admin/racers`}
              className="px-4 py-2 rounded border border-neutral-800 hover:bg-neutral-900"
            >
              Add racers
            </Link>
            <Link
              to={`/app/events/${eventId}/admin/times`}
              className="px-4 py-2 rounded border border-neutral-800 hover:bg-neutral-900"
            >
              Admin times
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setSearchParams({ tab: "live" })}
              className={`px-4 py-2 rounded border ${
                activeTab === "live"
                  ? "border-white bg-white text-black font-semibold"
                  : "border-neutral-800 hover:bg-neutral-900"
              }`}
            >
              Live timing
            </button>
            <button
              onClick={() => setSearchParams({ tab: "results" })}
              className={`px-4 py-2 rounded border ${
                activeTab === "results"
                  ? "border-white bg-white text-black font-semibold"
                  : "border-neutral-800 hover:bg-neutral-900"
              }`}
            >
              Results
            </button>
          </div>

          <button
            onClick={fetchData}
            className="text-sm px-3 py-2 rounded border border-neutral-800 hover:bg-neutral-900"
          >
            Refresh
          </button>
        </div>

        {activeTab === "live" ? (
          <>
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
              <div className="text-sm text-neutral-400">Latest</div>
              {latest ? (
                <div className="mt-2">
                  <div className="text-4xl sm:text-6xl font-bold tracking-tight">
                    {formatTime(latestFinal ?? latest.time_ms)}
                  </div>
                  <div className="mt-2 text-sm text-neutral-300">
                    {latest.car_number ? `#${latest.car_number}` : "Unassigned"}{" "}
                    {latest.racer_name ? `— ${latest.racer_name}` : ""}{" "}
                    {latest.stage ? `• Stage ${latest.stage}` : ""}{" "}
                    {latest.category ? `• ${latest.category}` : ""}
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-neutral-400">No assigned times yet.</div>
              )}
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
              <div className="text-sm text-neutral-400 mb-3">Recent</div>
              <div className="space-y-2">
                {liveRows.slice(0, 15).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between border border-neutral-900 rounded-xl px-4 py-3"
                  >
                    <div className="text-sm">
                      <div className="font-semibold">
                        {formatTime(r.time_ms + (r.penalty_ms || 0))}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {r.car_number ? `#${r.car_number}` : "Unassigned"}{" "}
                        {r.racer_name ? `— ${r.racer_name}` : ""}{" "}
                        {r.stage ? `• Stage ${r.stage}` : ""}{" "}
                        {r.category ? `• ${r.category}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-neutral-600">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-2 border-b border-neutral-800 overflow-x-auto">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`py-2 px-3 text-sm whitespace-nowrap border-b-2 ${
                    activeCategory === category ? "border-white" : "border-transparent text-neutral-400"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {activeCategory && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">{activeCategory}</div>
                  <button
                    onClick={() => exportCategoryToPDF(activeCategory, groupedByCategory[activeCategory])}
                    className="px-4 py-2 rounded bg-white text-black font-semibold"
                  >
                    Export PDF
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[900px] w-full text-left border-collapse">
                    <thead className="text-neutral-300">
                      <tr className="border-b border-neutral-800 text-sm">
                        <th className="p-2">Pilot</th>
                        <th className="p-2">#</th>
                        {activeCategory === "General" && <th className="p-2">Category</th>}
                        <th className="p-2">M1</th>
                        <th className="p-2">Pen1</th>
                        <th className="p-2">Total1</th>
                        <th className="p-2">M2</th>
                        <th className="p-2">Pen2</th>
                        <th className="p-2">Total2</th>
                        <th className="p-2">Best</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {groupedByCategory[activeCategory].map((entry) => {
                        const stage1 = (entry.stages[1] || 0) + (entry.penalties[1] || 0);
                        const stage2 = (entry.stages[2] || 0) + (entry.penalties[2] || 0);
                        let best = 0;
                        if (stage1 > 0 && stage2 > 0) best = Math.min(stage1, stage2);
                        else if (stage1 > 0) best = stage1;
                        else if (stage2 > 0) best = stage2;

                        return (
                          <tr key={entry.racer_id} className="border-b border-neutral-900">
                            <td className="p-2">{entry.racer_name}</td>
                            <td className="p-2">{entry.car_number || "-"}</td>
                            {activeCategory === "General" && (
                              <td className="p-2 text-neutral-300">{entry.category}</td>
                            )}
                            <td className="p-2">{formatTime(entry.stages[1] || 0)}</td>
                            <td className="p-2">{formatTime(entry.penalties[1] || 0)}</td>
                            <td className="p-2">{formatTime(stage1)}</td>
                            <td className="p-2">{formatTime(entry.stages[2] || 0)}</td>
                            <td className="p-2">{formatTime(entry.penalties[2] || 0)}</td>
                            <td className="p-2">{formatTime(stage2)}</td>
                            <td className="p-2 font-semibold">{formatTime(best)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}