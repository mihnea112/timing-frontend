import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";

interface TimeEntry {
  id: number;
  time_ms: number;
  racer_id: number | null;
  racer_name?: string | null;
  car_number?: string | null;
  category?: string | null;
  penalty_ms: number;
  stage: number | null;
  created_at: string;
}

interface Racer {
  id: number;
  name: string;
  car_number: string;
  category: string;
}

export default function EventAdminTimesPage() {
  const { eventId } = useParams();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [racers, setRacers] = useState<Racer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function fetchData() {
    setError(null);
    try {
      const [timesData, racersData] = await Promise.all([
        api<TimeEntry[]>(`/api/events/${eventId}/times`),
        api<Racer[]>(`/api/events/${eventId}/racers`),
      ]);
      setEntries(timesData);
      setRacers(racersData);
    } catch {
      setError("Failed to load times/racers.");
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${minutes}m ${seconds}s ${millis}ms`;
  };

  async function updateRacer(timeId: number, racer_id: number) {
    setBusyId(timeId);
    setError(null);
    try {
      await api(`/api/events/${eventId}/time/${timeId}/racer`, {
        method: "PATCH",
        body: JSON.stringify({ racer_id }),
      });
      await fetchData();
    } catch {
      setError("Failed to update racer.");
    } finally {
      setBusyId(null);
    }
  }

  async function updatePenalty(timeId: number, penaltySeconds: number) {
    setBusyId(timeId);
    setError(null);
    try {
      await api(`/api/events/${eventId}/time/${timeId}/penalty_ms`, {
        method: "PATCH",
        body: JSON.stringify({ penalty_ms: Math.max(0, Math.floor(penaltySeconds * 1000)) }),
      });
      await fetchData();
    } catch {
      setError("Failed to update penalty.");
    } finally {
      setBusyId(null);
    }
  }

  async function updateStage(timeId: number, stage: number) {
    setBusyId(timeId);
    setError(null);
    try {
      await api(`/api/events/${eventId}/time/${timeId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage }),
      });
      await fetchData();
    } catch {
      setError("Failed to update stage.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-400">Event</div>
            <div className="text-xl font-semibold">Admin • Times</div>
          </div>

          <div className="flex gap-2">
            <Link
              to="/app"
              className="px-4 py-2 rounded border border-neutral-800 hover:bg-neutral-900"
            >
              Back
            </Link>
            <Link
              to={`/app/events/${eventId}/results`}
              className="px-4 py-2 rounded border border-neutral-800 hover:bg-neutral-900"
            >
              Results
            </Link>
            <Link
              to={`/app/events/${eventId}/timing`}
              className="px-4 py-2 rounded bg-white text-black font-semibold"
            >
              Timing
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-neutral-950 border border-red-900 text-red-300 rounded-2xl p-4">
            {error}
          </div>
        )}

        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Time entries</div>
            <button
              onClick={fetchData}
              className="text-sm px-3 py-2 rounded border border-neutral-800 hover:bg-neutral-900"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left border-collapse">
              <thead className="text-neutral-400 text-sm">
                <tr className="border-b border-neutral-800">
                  <th className="p-2">ID</th>
                  <th className="p-2">Raw</th>
                  <th className="p-2">Assign racer</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Penalty (s)</th>
                  <th className="p-2">Stage</th>
                  <th className="p-2">Final</th>
                  <th className="p-2">Created</th>
                </tr>
              </thead>

              <tbody className="text-sm">
                {entries.map((entry) => {
                  const isBusy = busyId === entry.id;
                  return (
                    <tr key={entry.id} className="border-b border-neutral-900">
                      <td className="p-2">{entry.id}</td>
                      <td className="p-2">{formatTime(entry.time_ms)}</td>

                      <td className="p-2">
                        <select
                          className="bg-neutral-900 border border-neutral-800 px-2 py-1 rounded w-72"
                          value={entry.racer_id ?? ""}
                          disabled={isBusy}
                          onChange={(e) => updateRacer(entry.id, parseInt(e.target.value, 10))}
                        >
                          <option value="">--</option>
                          {racers.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.car_number} - {r.name} ({r.category})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-2">{entry.racer_name ?? ""}</td>
                      <td className="p-2">{entry.category ?? ""}</td>

                      <td className="p-2">
                        <input
                          type="number"
                          className="bg-neutral-900 border border-neutral-800 px-2 py-1 rounded w-24"
                          value={(entry.penalty_ms || 0) / 1000}
                          disabled={isBusy}
                          onChange={(e) => updatePenalty(entry.id, Number(e.target.value))}
                        />
                      </td>

                      <td className="p-2">
                        <select
                          className="bg-neutral-900 border border-neutral-800 px-2 py-1 rounded w-28"
                          value={entry.stage ?? ""}
                          disabled={isBusy}
                          onChange={(e) => updateStage(entry.id, parseInt(e.target.value, 10))}
                        >
                          <option value="">--</option>
                          <option value="1">Stage 1</option>
                          <option value="2">Stage 2</option>
                        </select>
                      </td>

                      <td className="p-2 font-semibold">
                        {formatTime(entry.time_ms + (entry.penalty_ms || 0))}
                      </td>

                      <td className="p-2 text-xs text-neutral-500">
                        {new Date(entry.created_at).toLocaleString()}
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
      </div>
    </div>
  );
}