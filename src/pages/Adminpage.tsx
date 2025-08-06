import { useEffect, useState } from "react";

interface TimeEntry {
  id: number;
  time_ms: number;
  car_number: number | null;
  penalty_ms: number;
  stage: number | null;
  created_at: string;
}

// Hardcoded login credentials for local use only
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "racing123";

export default function AdminPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
    } else {
      alert("Invalid credentials");
    }
  };

  const fetchData = () => {
    fetch(`${process.env.REACT_APP_API_URL}/api/times`)
      .then((res) => res.json())
      .then((data) => setEntries(data));
  };

  const updateCar = async (
    id: number,
    field: "car_number" | "penalty_ms",
    value: number
  ) => {
    const payload =
      field === "penalty_ms"
        ? { [field]: value * 1000 }
        : { [field]: value };

    await fetch(`${process.env.REACT_APP_API_URL}/api/time/${id}/${field}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    fetchData();
  };

  const updateStage = async (id: number, stage: number) => {
    await fetch(`${process.env.REACT_APP_API_URL}/api/time/${id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    fetchData();
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${minutes}m ${seconds}s ${millis}ms`;
  };

  // If not logged in, show login form
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <form
          onSubmit={handleLogin}
          className="bg-gray-900 p-6 rounded shadow-md space-y-4 w-80"
        >
          <h2 className="text-xl font-bold">🔐 Admin Login</h2>
          <div>
            <label className="block text-sm">Username</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm">Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-white font-semibold"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  // If logged in, show admin panel
  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold text-white">🏁 Admin Dashboard</h1>
      <table className="w-full table-auto text-left border-collapse text-white">
        <thead>
          <tr className="border-b border-gray-600">
            <th className="p-2">ID</th>
            <th className="p-2">Timp Mansa</th>
            <th className="p-2">Car #</th>
            <th className="p-2">Penalizare (s)</th>
            <th className="p-2">Mansa</th>
            <th className="p-2">Timp final</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            return (
              <tr key={entry.id} className="border-b border-gray-800">
                <td className="p-2">{entry.id}</td>
                <td className="p-2">{formatTime(entry.time_ms)}</td>
                <td className="p-2">
                  <input
                    type="number"
                    className="bg-gray-800 border border-gray-700 px-2 py-1 rounded text-white w-20"
                    value={entry.car_number ?? ""}
                    onChange={(e) =>
                      updateCar(entry.id, "car_number", parseInt(e.target.value))
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    className="bg-gray-800 border border-gray-700 px-2 py-1 rounded text-white w-20"
                    value={entry.penalty_ms / 1000}
                    onChange={(e) =>
                      updateCar(entry.id, "penalty_ms", parseInt(e.target.value))
                    }
                  />
                </td>
                <td className="p-2">
                  <select
                    className="bg-gray-800 border border-gray-700 px-2 py-1 rounded text-white w-24"
                    value={entry.stage ?? ""}
                    onChange={(e) =>
                      updateStage(entry.id, parseInt(e.target.value))
                    }
                  >
                    <option value="">--</option>
                    <option value="1">Mansa 1</option>
                    <option value="2">Mansa 2</option>
                  </select>
                </td>
                <td className="p-2">
                  {formatTime(entry.time_ms + entry.penalty_ms)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}