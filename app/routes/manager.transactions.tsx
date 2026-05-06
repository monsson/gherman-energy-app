import { Link } from "react-router";
import { AppShell, Card } from "~/components/AppShell";
import { cars, stations, transactions } from "~/lib/data";
import { formatDateTime, formatLei } from "~/lib/format";
import { useSession } from "./auth-layout";

export default function ManagerTransactions() {
  const session = useSession();

  // Group by date.
  const groups = new Map<string, typeof transactions>();
  for (const t of transactions) {
    const day = new Date(t.date).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(t);
  }

  return (
    <AppShell session={session} title="Tranzacții" back="/manager">
      <div className="space-y-4">
        {[...groups.entries()].map(([day, items]) => {
          const dayTotal = items.reduce((s, t) => s + t.total, 0);
          return (
            <div key={day}>
              <div className="flex justify-between items-center px-1 mb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{day}</h3>
                <span className="text-xs font-semibold text-slate-700">{formatLei(dayTotal)}</span>
              </div>
              <Card>
                <ul className="divide-y divide-slate-100">
                  {items.map((t) => {
                    const car = cars.find((c) => c.id === t.carId)!;
                    const station = stations.find((s) => s.id === t.stationId)!;
                    return (
                      <li key={t.id}>
                        <Link
                          to={`/car/${car.id}`}
                          className="p-3 flex items-center gap-3 active:bg-slate-50"
                        >
                          <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-lg">
                            ⛽
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">
                              {car.plate} · {car.brand} {car.model}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {station.name} · {t.fuel} · {t.liters.toFixed(1)} L
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {formatDateTime(t.date)}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-sm">{formatLei(t.total)}</div>
                            <div className="text-[11px] text-slate-500">
                              {t.pricePerLiter.toFixed(2)} lei/L
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
