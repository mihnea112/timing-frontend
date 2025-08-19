import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TimeEntry {
  id: number;
  time_ms: number;
  penalty_ms: number;
  stage: number | null;
  racer_id: number;
  racer_name: string;
  car_number: number | null;
  category: string;
  created_at: string;
}

interface GroupedEntry {
  racer_id: number;
  racer_name: string;
  car_number: number | null;
  category: string;
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
    if (ms >= 480000) {
      return "Abandon";
    }
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 100;
    return `${minutes}m ${seconds}s ${millis}ms`;
  };

  // Group entries by racer_id and accumulate stages and penalties
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

  // Group racers by category
  const groupedByCategory: { [category: string]: GroupedEntry[] } = {};
  for (const racer of Object.values(grouped)) {
    if (!groupedByCategory[racer.category]) {
      groupedByCategory[racer.category] = [];
    }
    groupedByCategory[racer.category].push(racer);
  }

  // Sort racers within each category by their best total time (stage + penalty)
  for (const category in groupedByCategory) {
    groupedByCategory[category].sort((a, b) => {
      const aTotal =
        (a.stages[1] || 0) +
        (a.penalties[1] || 0) +
        (a.stages[2] || 0) +
        (a.penalties[2] || 0);
      const bTotal =
        (b.stages[1] || 0) +
        (b.penalties[1] || 0) +
        (b.stages[2] || 0) +
        (b.penalties[2] || 0);
      return aTotal - bTotal;
    });
  }

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Panou Timpi Timisoara grand Prix", 14, 20);

    const tableColumn = [
      "Nume Pilot",
      "Numar Concurs #",
      "Timp Mansa 1",
      "Penalizare Mansa 1",
      "Total Mansa 1",
      "Timp Mansa 2",
      "Penalizare Mansa 2",
      "Total Mansa 2",
      "Timp Final",
    ];

    let startY = 30;

    for (const category of Object.keys(groupedByCategory)) {
      doc.setFontSize(16);
      doc.text(`Categorie: ${category}`, 14, startY);
      startY += 8;

      const tableRows = groupedByCategory[category].map((entry) => {
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
          entry.racer_name,
          entry.car_number || "-",
          formatTime(entry.stages[1] || 0),
          formatTime(entry.penalties[1] || 0),
          formatTime(stage1),
          formatTime(entry.stages[2] || 0),
          formatTime(entry.penalties[2] || 0),
          formatTime(stage2),
          formatTime(total),
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY,
        theme: "grid",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
      });

      startY = (doc as any).lastAutoTable.finalY + 10;
    }

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

      {Object.keys(groupedByCategory).map((category) => (
        <div key={category}>
          <h2 className="text-lg font-semibold mt-6 mb-2">{category}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] sm:min-w-full w-full table-auto text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-600 text-sm sm:text-base">
                  <th className="p-2">Nume Pilot</th>
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
                {groupedByCategory[category].map((entry) => {
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
                      key={entry.racer_id}
                      className="border-b border-gray-800 text-sm sm:text-base"
                    >
                      <td className="p-2">{entry.racer_name}</td>
                      <td className="p-2">{entry.car_number || "-"}</td>
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
      ))}
    </div>
  );
}
