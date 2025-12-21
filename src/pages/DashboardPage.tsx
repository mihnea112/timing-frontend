import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

type EventRow = {
  id: number;
  name: string;
  location: string | null;
  event_date: string | null;
  status: "draft" | "live" | "closed";
  created_at: string;
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  // create event
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdIngestKey, setCreatedIngestKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api<EventRow[]>("/api/events");
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createEvent() {
    if (!name.trim()) return;
    setCreating(true);
    setCreatedIngestKey(null);
    try {
      const created = await api<{ id: number; ingest_key: string }>(
        "/api/events",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            location: location || null,
            event_date: eventDate || null,
          }),
        }
      );
      setName("");
      setLocation("");
      setEventDate("");
      setCreatedIngestKey(created.ingest_key);
      await load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-400">Organizer</div>
            <div className="text-lg font-semibold">
              {user?.name || user?.email}
            </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 rounded border border-neutral-800 hover:bg-neutral-900"
          >
            Logout
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
            <h2 className="font-semibold">Create event</h2>
            <div className="mt-4 space-y-3">
              <input
                className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
                placeholder="Event name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
                placeholder="Location (optional)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <input
                className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />

              <button
                onClick={createEvent}
                disabled={creating || !name.trim()}
                className="w-full px-4 py-2 rounded bg-white text-black font-semibold disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create"}
              </button>

              {createdIngestKey && (
                <div className="text-sm text-neutral-300 mt-3">
                  <div className="text-neutral-400">
                    Arduino ingest key (save this):
                  </div>
                  <div className="mt-1 font-mono text-xs break-all p-2 rounded bg-neutral-900 border border-neutral-800">
                    {createdIngestKey}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-end justify-between">
              <h2 className="text-xl font-semibold">Your events</h2>
              <button
                onClick={load}
                className="text-sm px-3 py-2 rounded border border-neutral-800 hover:bg-neutral-900"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-neutral-400">Loading…</div>
              ) : events.length === 0 ? (
                <div className="text-neutral-400">No events yet.</div>
              ) : (
                events.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div>
                      <div className="text-sm text-neutral-400">
                        {ev.status.toUpperCase()} • {ev.event_date || "No date"}{" "}
                        • {ev.location || "No location"}
                      </div>
                      <div className="text-lg font-semibold">{ev.name}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/app/events/${ev.id}/timing?tab=results`}
                        className="px-4 py-2 rounded bg-white text-black font-semibold"
                      >
                        Results
                      </Link>


                      <Link
                        to={`/app/events/${ev.id}/admin/racers`}
                        className="px-4 py-2 rounded border border-neutral-800 hover:bg-neutral-900"
                      >
                        Add racers
                      </Link>

                      <Link
                        to={`/app/events/${ev.id}/admin/times`}
                        className="px-4 py-2 rounded border border-neutral-800 hover:bg-neutral-900"
                      >
                        Admin
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
