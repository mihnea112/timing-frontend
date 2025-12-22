import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

type EventRow = {
  id: number;
  name: string;
  event_date: string | null;
  location: string | null;
  status: "draft" | "live" | "closed";
};

type DeviceRow = {
  id: number;
  name: string | null;
  device_key: string;
  active_event_id: number | null;
  active_event_name: string | null;
  last_seen_at: string | null;
  last_ip: string | null;
  last_user_agent: string | null;
};

function timeAgo(dateIso: string | null) {
  if (!dateIso) return "never";
  const t = new Date(dateIso).getTime();
  if (!Number.isFinite(t)) return "unknown";
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdDeviceKey, setCreatedDeviceKey] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [d, e] = await Promise.all([
        api<DeviceRow[]>("/api/devices"),
        api<EventRow[]>("/api/events"),
      ]);
      setDevices(d);
      setEvents(e);
    } catch {
      setError("Failed to load devices/events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const eventsById = useMemo(() => {
    const m = new Map<number, EventRow>();
    for (const e of events) m.set(e.id, e);
    return m;
  }, [events]);

  async function createDevice() {
    setCreating(true);
    setCreatedDeviceKey(null);
    setError(null);
    try {
      const created = await api<{ id: number; name: string | null; device_key: string }>(
        "/api/devices",
        {
          method: "POST",
          body: JSON.stringify({ name: newName.trim() || null }),
        }
      );
      setNewName("");
      setCreatedDeviceKey(created.device_key);
      await loadAll();
    } catch {
      setError("Failed to create device.");
    } finally {
      setCreating(false);
    }
  }

  async function setActiveEvent(deviceId: number, active_event_id: number | null) {
    setBusyId(deviceId);
    setError(null);
    try {
      await api(`/api/devices/${deviceId}/active-event`, {
        method: "PATCH",
        body: JSON.stringify({ active_event_id }),
      });
      await loadAll();
    } catch {
      setError("Failed to assign device to event.");
    } finally {
      setBusyId(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore; user can manually copy
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-400">Organizer</div>
            <div className="text-xl font-semibold">Devices</div>
            <div className="text-xs text-neutral-500 mt-1">
              Arduino posts to <span className="font-mono">POST /api/time</span> with{" "}
              <span className="font-mono">X-Device-Key</span>. You assign the event here.
            </div>
          </div>

          <div className="flex gap-2">
            <Link to="/app" className="px-4 py-2 rounded border border-neutral-800 hover:bg-neutral-900">
              Back
            </Link>
            <button
              onClick={loadAll}
              className="px-4 py-2 rounded border border-neutral-800 hover:bg-neutral-900"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-neutral-950 border border-red-900 text-red-300 rounded-2xl p-4">
            {error}
          </div>
        )}

        {/* Create device */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
          <div className="font-semibold">Create device</div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              className="sm:col-span-2 w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
              placeholder="Device name (optional) e.g. Start Gate #1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              onClick={createDevice}
              disabled={creating}
              className="px-4 py-2 rounded bg-white text-black font-semibold disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>

          {createdDeviceKey && (
            <div className="mt-4 text-sm text-neutral-300">
              <div className="text-neutral-400">Device key (paste once into Arduino firmware):</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 font-mono text-xs break-all p-2 rounded bg-neutral-900 border border-neutral-800">
                  {createdDeviceKey}
                </div>
                <button
                  onClick={() => copy(createdDeviceKey)}
                  className="px-3 py-2 rounded border border-neutral-800 hover:bg-neutral-900 text-sm"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* List devices */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Your devices</div>
          </div>

          <div className="mt-4 overflow-x-auto">
            {loading ? (
              <div className="text-neutral-400">Loading…</div>
            ) : devices.length === 0 ? (
              <div className="text-neutral-400">No devices yet.</div>
            ) : (
              <table className="min-w-[1000px] w-full text-left border-collapse">
                <thead className="text-neutral-400 text-sm">
                  <tr className="border-b border-neutral-800">
                    <th className="p-2">Device</th>
                    <th className="p-2">Device key</th>
                    <th className="p-2">Assigned event</th>
                    <th className="p-2">Last seen</th>
                    <th className="p-2">Last IP</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {devices.map((d) => {
                    const busy = busyId === d.id;
                    const currentEvent = d.active_event_id ? eventsById.get(d.active_event_id) : null;

                    return (
                      <tr key={d.id} className="border-b border-neutral-900">
                        <td className="p-2">
                          <div className="font-semibold">{d.name || `Device #${d.id}`}</div>
                          <div className="text-xs text-neutral-500">
                            {d.last_user_agent ? d.last_user_agent : ""}
                          </div>
                        </td>

                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-xs break-all max-w-[420px]">
                              {d.device_key}
                            </div>
                            <button
                              onClick={() => copy(d.device_key)}
                              className="px-2 py-1 rounded border border-neutral-800 hover:bg-neutral-900 text-xs"
                            >
                              Copy
                            </button>
                          </div>
                        </td>

                        <td className="p-2">
                          <select
                            className="bg-neutral-900 border border-neutral-800 px-2 py-1 rounded w-80"
                            disabled={busy}
                            value={d.active_event_id ?? ""}
                            onChange={(e) =>
                              setActiveEvent(
                                d.id,
                                e.target.value === "" ? null : Number(e.target.value)
                              )
                            }
                          >
                            <option value="">— Not assigned —</option>
                            {events.map((ev) => (
                              <option key={ev.id} value={ev.id}>
                                #{ev.id} • {ev.name} • {ev.status.toUpperCase()}
                              </option>
                            ))}
                          </select>

                          <div className="text-xs text-neutral-500 mt-1">
                            {currentEvent
                              ? `Currently: ${currentEvent.name}`
                              : "Arduino will get 409 until assigned."}
                          </div>
                        </td>

                        <td className="p-2 text-neutral-300">
                          {timeAgo(d.last_seen_at)}
                          <div className="text-xs text-neutral-600">
                            {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : ""}
                          </div>
                        </td>

                        <td className="p-2 text-neutral-400">
                          {d.last_ip || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-3 text-xs text-neutral-500">
            Tip: On Arduino boot you can call <span className="font-mono">POST /api/devices/heartbeat</span> with{" "}
            <span className="font-mono">X-Device-Key</span> to populate “Last seen”.
          </div>
        </div>
      </div>
    </div>
  );
}