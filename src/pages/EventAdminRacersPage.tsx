import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";

interface Racer {
  id: number;
  event_id: number;
  name: string;
  car_number: string;
  category: string;
  created_at?: string;
}

const categories = [
  "C1",
  "C2",
  "C3",
  "Drift",
  "Rally Cross",
  "Juniori",
  "Feminin",
  "Eco-Karting",
  "Eco-Karting Juniori",
  "Karting",
  "Karting Juniori",
  "Forlighter",
];

export default function EventAdminRacersPage() {
  const { eventId } = useParams();
  const [racers, setRacers] = useState<Racer[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchRacers() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Racer[]>(`/api/events/${eventId}/racers`);
      setRacers(data);
    } catch (e: any) {
      setError("Failed to load racers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRacers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function addRacer() {
    if (!name.trim() || !carNumber.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api<Racer>(`/api/events/${eventId}/racers`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          car_number: carNumber.trim(),
          category,
        }),
      });
      setRacers((prev) => [...prev, created]);
      setName("");
      setCarNumber("");
      setCategory(categories[0]);
    } catch {
      setError("Failed to add racer.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRacer(racerId: number) {
    setBusy(true);
    setError(null);
    try {
      await api<void>(`/api/events/${eventId}/racers/${racerId}`, { method: "DELETE" });
      setRacers((prev) => prev.filter((r) => r.id !== racerId));
    } catch {
      setError("Failed to delete racer.");
    } finally {
      setBusy(false);
    }
  }

  async function abandonStage(racerId: number, stage: 1 | 2) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/events/${eventId}/racers/${racerId}/abandon`, {
        method: "PATCH",
        body: JSON.stringify({ stage }),
      });
    } catch {
      setError(`Failed to abandon stage ${stage}.`);
    } finally {
      setBusy(false);
    }
  }

  const grouped = useMemo(() => {
    const m: Record<string, Racer[]> = {};
    for (const r of racers) {
      if (!m[r.category]) m[r.category] = [];
      m[r.category].push(r);
    }
    return m;
  }, [racers]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-400">Event</div>
            <div className="text-xl font-semibold">Admin • Racers</div>
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

        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Add racer</div>
            <button
              onClick={fetchRacers}
              className="text-sm px-3 py-2 rounded border border-neutral-800 hover:bg-neutral-900"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              className="sm:col-span-2 px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
              placeholder="Racer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
              placeholder="Car #"
              value={carNumber}
              onChange={(e) => setCarNumber(e.target.value)}
            />
            <select
              className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              onClick={addRacer}
              disabled={busy || !name.trim() || !carNumber.trim()}
              className="sm:col-span-4 px-4 py-2 rounded bg-white text-black font-semibold disabled:opacity-60"
            >
              {busy ? "Working…" : "Add racer"}
            </button>

            {error && <div className="sm:col-span-4 text-sm text-red-400">{error}</div>}
          </div>
        </div>

        {loading ? (
          <div className="text-neutral-400">Loading racers…</div>
        ) : racers.length === 0 ? (
          <div className="text-neutral-400">No racers yet.</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, list]) => (
              <div key={cat} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
                <div className="font-semibold">{cat}</div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[700px] w-full text-left border-collapse">
                    <thead className="text-neutral-400 text-sm">
                      <tr className="border-b border-neutral-800">
                        <th className="p-2">Car #</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {list.map((r) => (
                        <tr key={r.id} className="border-b border-neutral-900">
                          <td className="p-2">{r.car_number}</td>
                          <td className="p-2">{r.name}</td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => deleteRacer(r.id)}
                                disabled={busy}
                                className="px-3 py-1 rounded border border-neutral-800 hover:bg-neutral-900 disabled:opacity-60"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => abandonStage(r.id, 1)}
                                disabled={busy}
                                className="px-3 py-1 rounded border border-neutral-800 hover:bg-neutral-900 disabled:opacity-60"
                              >
                                Abandon S1
                              </button>
                              <button
                                onClick={() => abandonStage(r.id, 2)}
                                disabled={busy}
                                className="px-3 py-1 rounded border border-neutral-800 hover:bg-neutral-900 disabled:opacity-60"
                              >
                                Abandon S2
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}