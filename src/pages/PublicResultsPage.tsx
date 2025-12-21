import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

type TimeEntry = {
  id: number;
  time_ms: number;
  penalty_ms: number;
  stage: number | null;
  racer_id: number;
  racer_name: string;
  car_number: string | null;
  category: string;
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

export default function PublicResultsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  async function fetchData() {
    if (!eventId) return;
    const data = await api<TimeEntry[]>(`/api/public/events/${eventId}/times`);
    setEntries(data);
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const formatTime = (ms: number) => {
    if (ms >= 480000) return "Abandon";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${minutes}m ${seconds}s ${millis}ms`;
  };

  const groupedByCategory = useMemo(() => {
    const grouped: { [racerId: number]: GroupedEntry } = {};
    for (const entry of entries) {
      if (entry.stage === null) continue;
      if (!grouped[entry.racer_id]) {
        grouped[entry.racer_id] = {
          racer_id: entry.racer_id,
          racer_name: entry.racer_name,
          car_number: entry.car_number,
          category: entry.category,
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
      const normalize = (t: number) =>
        !t || t >= 480000 ? Number.POSITIVE_INFINITY : t;
      return Math.min(normalize(s1), normalize(s2));
    };

    for (const c of Object.keys(byCat)) {
      byCat[c].sort((a, b) => {
        const ta = bestTotal(a);
        const tb = bestTotal(b);
        if (ta === tb) {
          const aNum = a.car_number
            ? parseInt(a.car_number, 10)
            : Number.POSITIVE_INFINITY;
          const bNum = b.car_number
            ? parseInt(b.car_number, 10)
            : Number.POSITIVE_INFINITY;
          const byNum = aNum - bNum;
          if (byNum !== 0) return byNum;
          return a.racer_name.localeCompare(b.racer_name);
        }
        return ta - tb;
      });
    }

    return byCat;
  }, [entries]);

  const tabs = useMemo(() => {
    const keys = Object.keys(groupedByCategory);
    if (keys.includes("General")) {
      return ["General", ...keys.filter((k) => k !== "General")];
    }
    return keys;
  }, [groupedByCategory]);

  useEffect(() => {
    if (!activeCategory && tabs.length > 0) {
      setActiveCategory(tabs[0]);
    }
  }, [tabs, activeCategory]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <div className="text-sm text-neutral-400">Public results</div>
          <div className="text-xl font-semibold">Leaderboard</div>
        </div>

        <div className="flex gap-2 border-b border-neutral-800 overflow-x-auto">
          {tabs.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`py-2 px-3 text-sm whitespace-nowrap border-b-2 ${
                activeCategory === category
                  ? "border-white"
                  : "border-transparent text-neutral-400"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {activeCategory && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
            <div className="text-lg font-semibold">{activeCategory}</div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[900px] w-full text-left border-collapse">
                <thead className="text-neutral-300">
                  <tr className="border-b border-neutral-800 text-sm">
                    <th className="p-2">Pilot</th>
                    <th className="p-2">#</th>
                    {activeCategory === "General" && (
                      <th className="p-2">Category</th>
                    )}
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
                    const stage1 =
                      (entry.stages[1] || 0) + (entry.penalties[1] || 0);
                    const stage2 =
                      (entry.stages[2] || 0) + (entry.penalties[2] || 0);
                    let best = 0;
                    if (stage1 > 0 && stage2 > 0)
                      best = Math.min(stage1, stage2);
                    else if (stage1 > 0) best = stage1;
                    else if (stage2 > 0) best = stage2;

                    return (
                      <tr
                        key={entry.racer_id}
                        className="border-b border-neutral-900"
                      >
                        <td className="p-2">{entry.racer_name}</td>
                        <td className="p-2">{entry.car_number || "-"}</td>
                        {activeCategory === "General" && (
                          <td className="p-2 text-neutral-300">{entry.category}</td>
                        )}
                        <td className="p-2">
                          {formatTime(entry.stages[1] || 0)}
                        </td>
                        <td className="p-2">
                          {formatTime(entry.penalties[1] || 0)}
                        </td>
                        <td className="p-2">{formatTime(stage1)}</td>
                        <td className="p-2">
                          {formatTime(entry.stages[2] || 0)}
                        </td>
                        <td className="p-2">
                          {formatTime(entry.penalties[2] || 0)}
                        </td>
                        <td className="p-2">{formatTime(stage2)}</td>
                        <td className="p-2 font-semibold">
                          {formatTime(best)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-xs text-neutral-500">
              Auto-refresh every 5 seconds.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
