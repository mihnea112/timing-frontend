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
  car_number: string | null;
  category: string;
  created_at: string;
}

interface GroupedEntry {
  racer_id: number;
  racer_name: string;
  car_number: string | null;
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

  // Best valid total for sorting: pick the better (smaller) stage+penalty.
  // Missing times (0/undefined) or Abandon (>= 480000 ms) are treated as Infinity.
  const bestTotal = (e: GroupedEntry) => {
    const s1 = (e.stages[1] ?? 0) + (e.penalties[1] ?? 0);
    const s2 = (e.stages[2] ?? 0) + (e.penalties[2] ?? 0);

    const normalize = (t: number) => {
      if (!t) return Number.POSITIVE_INFINITY;
      if (t >= 480000) return Number.POSITIVE_INFINITY;
      return t;
    };

    const t1 = normalize(s1);
    const t2 = normalize(s2);
    return Math.min(t1, t2);
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

  // Sort racers within each category by best (lowest) valid total.
  // Missing/abandon runs are pushed to the end.
  // Tie-break by car number (numeric) then by racer name.
  for (const category in groupedByCategory) {
    groupedByCategory[category].sort((a, b) => {
      const ta = bestTotal(a);
      const tb = bestTotal(b);

      if (ta === tb) {
        const aNum = a.car_number ? parseInt(a.car_number as string, 10) : Number.POSITIVE_INFINITY;
        const bNum = b.car_number ? parseInt(b.car_number as string, 10) : Number.POSITIVE_INFINITY;
        const byNum = aNum - bNum;
        if (byNum !== 0) return byNum;
        return a.racer_name.localeCompare(b.racer_name);
      }
      return ta - tb;
    });
  }

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Panou Timpi Timisoara Grand Prix", 14, 20);

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
