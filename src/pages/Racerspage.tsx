import { useEffect, useState } from "react";

interface TimeEntry {
  id: number;
  time_ms: number;
  car_number: number | null;
  penalty_ms: number;
  stage: number | null;
  created_at: string;
}

interface GroupedEntry {
  car_number: number;
  stages: { [stage: number]: number };
  penalties: { [stage: number]: number };
}

export default function RacersPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  const fetchData = () => {
    fetch(`${process.env.REACT_APP_API_URL}/api/times`)
      .then((res) => res.json())
      .then((data) => setEntries(data));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${minutes}m ${seconds}s ${millis}ms`;
  };

  const grouped: { [car: number]: GroupedEntry } = {};
  for (const entry of entries) {
    if (entry.car_number === null || entry.stage === null) continue;
    if (!grouped[entry.car_number]) {
      grouped[entry.car_number] = {
        car_number: entry.car_number,
        stages: {},
        penalties: {},
      };
    }
    grouped[entry.car_number].stages[entry.stage] = entry.time_ms;
    grouped[entry.car_number].penalties[entry.stage] = entry.penalty_ms;
  }

  const sorted = Object.values(grouped).sort((a, b) => {
    const aTotal =
      (a.stages[1] || 0) +
      (a.stages[2] || 0) +
      (a.penalties[1] || 0) +
      (a.penalties[2] || 0);
    const bTotal =
      (b.stages[1] || 0) +
      (b.stages[2] || 0) +
      (b.penalties[1] || 0) +
      (b.penalties[2] || 0);
    return aTotal - bTotal;
  });

  return (
    <div className="p-4 space-y-6 text-white">
      <h1 className="text-2xl font-bold">🏎️ Racer Standings</h1>
      <table className="w-full table-auto text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-600">
            <th className="p-2">Car #</th>
            <th className="p-2">Mansa 1</th>
            <th className="p-2">Mansa 2</th>
            <th className="p-2">Timp Final</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => {
            const stage1 = (entry.stages[1] || 0) + (entry.penalties[1] || 0);
            const stage2 = (entry.stages[2] || 0) + (entry.penalties[2] || 0);
            let total = 0;
            if (stage1 > 0 && stage2 > 0) {
              total = Math.min(stage1, stage2);
            } else if (stage1 > 0) {
              total = stage1;
            } else if (stage2 > 0) {
              total = stage2;
            } else {
              total = 0; // or keep empty if you want
            }
            return (
              <tr key={entry.car_number} className="border-b border-gray-800">
                <td className="p-2">{entry.car_number}</td>
                <td className="p-2">{formatTime(stage1)}</td>
                <td className="p-2">{formatTime(stage2)}</td>
                <td className="p-2 font-semibold">{formatTime(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
