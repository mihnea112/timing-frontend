import { useState, useEffect } from "react";

interface Racer {
  id: number;
  name: string;
  car_number: number;
  category: string;
}

const categories = [
  "C1",
  "C2",
  "C3",
  "Drift",
  "Karting",
  "Eco-Karting",
  "Juniori",
  "Feminin",
];

export default function AddRacersPage() {
  const [racers, setRacers] = useState<Racer[]>([]);
  const [name, setName] = useState("");
  const [carNumber, setCarNumber] = useState<number | "">("");
  const [category, setCategory] = useState(categories[0]);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchRacers() {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/racers`);
        if (res.ok) {
          const data = await res.json();
          setRacers(data);
        }
      } catch (error) {
        console.error("Failed to fetch racers:", error);
      }
    }
    if (authenticated) {
      fetchRacers();
    }
  }, [authenticated]);

  const handleAddRacer = async () => {
    if (!name || !carNumber) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/racers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name,
          car_number: Number(carNumber),
          category: category,
        }),
      });
      if (res.ok) {
        const newRacer: Racer = await res.json();
        setRacers([...racers, newRacer]);
        setName("");
        setCarNumber("");
        setCategory(categories[0]);
      }
    } catch (error) {
      console.error("Failed to add racer:", error);
    }
  };

  const handleDeleteRacer = async (id: number) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/racers/${id}`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        setRacers(racers.filter((racer) => racer.id !== id));
      } else {
        console.error("Failed to delete racer");
      }
    } catch (error) {
      console.error("Failed to delete racer:", error);
    }
  };

  const handleAbandonStage = async (racerId: number, stage: 1 | 2) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/racers/${racerId}/abandon`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stage: stage,
          }),
        }
      );
      if (!res.ok) {
        console.error(`Failed to abandon stage ${stage} for racer ${racerId}`);
      }
    } catch (error) {
      console.error(
        `Failed to abandon stage ${stage} for racer ${racerId}:`,
        error
      );
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "racing123") {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white px-4">
        <form
          onSubmit={handleLoginSubmit}
          className="bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-sm"
        >
          <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 text-white mb-4"
          />
          {error && (
            <p className="text-red-500 mb-4" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  // Group racers by category
  const grouped: { [key: string]: Racer[] } = {};
  for (const racer of racers) {
    if (!grouped[racer.category]) grouped[racer.category] = [];
    grouped[racer.category].push(racer);
  }

  return (
    <div className="px-4 py-6 text-white space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">➕ Add Racers</h1>

      {/* Form */}
      <div className="bg-gray-800 p-4 rounded-lg space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Racer Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 rounded bg-gray-700 text-white flex-1"
          />
          <input
            type="number"
            placeholder="Car Number"
            value={carNumber}
            onChange={(e) => setCarNumber(Number(e.target.value))}
            className="px-3 py-2 rounded bg-gray-700 text-white w-32"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded bg-gray-700 text-white"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddRacer}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
          >
            Add Racer
          </button>
        </div>
      </div>

      {/* Grouped Racers */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([cat, racers]) => (
          <div key={cat} className="bg-gray-900 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">{cat}</h2>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-2">Car #</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {racers.map((r) => (
                  <tr key={r.id} className="border-b border-gray-800">
                    <td className="p-2">{r.car_number}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2 flex gap-2">
                      <button
                        onClick={() => handleDeleteRacer(r.id)}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleAbandonStage(r.id, 1)}
                        className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-white"
                      >
                        Abandon Stage 1
                      </button>
                      <button
                        onClick={() => handleAbandonStage(r.id, 2)}
                        className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-white"
                      >
                        Abandon Stage 2
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
