import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

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
    const millis = ms % 100;
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

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("🏎️ Panou Timpi", 14, 20);

    const tableColumn = [
      "Numar Concurs #",
      "Timp Mansa 1",
      "Penalizare Mansa 1",
      "Total Mansa 1",
      "Timp Mansa 2",
      "Penalizare Mansa 2",
      "Total Mansa 2",
      "Timp Final",
    ];

    const tableRows = sorted.map((entry) => {
      const stage1 = (entry.stages[1] || 0) + (entry.penalties[1] || 0);
      const stage2 = (entry.stages[2] || 0) + (entry.penalties[2] || 0);
      let total = 0;
      if (stage1 > 0 && stage2 > 0) {
        total = Math.min(stage1, stage2);
      } else if (stage1 > 0) {
        total = stage1;
      } else if (stage2 > 0) {
        total = stage2;
      }

      return [
        entry.car_number,
        formatTime(entry.stages[1] || 0),
        formatTime(entry.penalties[1] || 0),
        formatTime(stage1),
        formatTime(entry.stages[2] || 0),
        formatTime(entry.penalties[2] || 0),
        formatTime(stage2),
        formatTime(total),
      ];
    });

    // @ts-ignore
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });

    doc.save("panou_timpi.pdf");
  };

  return (
    <div className="px-4 py-6 space-y-6 text-white">
      <h1 className="text-xl sm:text-2xl font-bold">🏎️ Panou Timpi</h1>

      <button
        onClick={exportToPDF}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Export to PDF
      </button>

      <div className="overflow-x-auto">
        <table className="min-w-[700px] sm:min-w-full w-full table-auto text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-600 text-sm sm:text-base">
              <th className="p-2">Numar Concurs #</th>
              <th className="p-2">Timp Mansa 1</th>
              <th className="p-2">Penalizare Mansa 1</th>
              <th className="p-2">Total Mansa 1</th>
              <th className="p-2">Timp Mansa 2</th>
              <th className="p-2">Penalizare Mansa 2</th>
              <th className="p-2">Total Mansa 2</th>
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
                total = 0;
              }
              return (
                <tr
                  key={entry.car_number}
                  className="border-b border-gray-800 text-sm sm:text-base"
                >
                  <td className="p-2">{entry.car_number}</td>
                  <td className="p-2">{formatTime(entry.stages[1] || 0)}</td>
                  <td className="p-2">{formatTime(entry.penalties[1] || 0)}</td>
                  <td className="p-2">{formatTime(stage1)}</td>
                  <td className="p-2">{formatTime(entry.stages[2] || 0)}</td>
                  <td className="p-2">{formatTime(entry.penalties[2] || 0)}</td>
                  <td className="p-2">{formatTime(stage2)}</td>
                  <td className="p-2 font-bold">{formatTime(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
