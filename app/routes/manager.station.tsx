import { Link, useParams } from "react-router";
import { AppShell, Card, Section } from "~/components/AppShell";
import {
  cars,
  getStation,
  transactionsForStation,
} from "~/lib/data";
import { formatDateTime, formatLei } from "~/lib/format";
import { useSession } from "./auth-layout";

export default function ManagerStation() {
  const session = useSession();
  const { id } = useParams();
  const station = getStation(Number(id));

  if (!station) {
    return (
      <AppShell session={session} title="Stație" back="/manager">
        <p className="text-center text-slate-500 py-12">Stație inexistentă.</p>
      </AppShell>
    );
  }

  const txs = transactionsForStation(station.id);
  const total = txs.reduce((s, t) => s + t.total, 0);
  const liters = txs.reduce((s, t) => s + t.liters, 0);

  return (
    <AppShell session={session} title={station.name} back="/manager">
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-3xl">
            🏪
          </div>
          <div className="flex-1">
            <h2 className="font-bold">{station.name}</h2>
            <p className="text-sm text-slate-500">{station.address}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
              Benzină
            </div>
            <div className="text-lg font-extrabold">{station.petrolPrice.toFixed(2)} lei/L</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
              Motorină
            </div>
            <div className="text-lg font-extrabold">{station.dieselPrice.toFixed(2)} lei/L</div>
          </div>
          <div className="bg-brand-600 text-white rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider font-bold text-brand-100">
              Total alimentări
            </div>
            <div className="text-lg font-extrabold">{formatLei(total)}</div>
          </div>
          <div className="bg-slate-900 text-white rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
              Total litri
            </div>
            <div className="text-lg font-extrabold">{Math.round(liters)} L</div>
          </div>
        </div>
      </Card>

      <Section title={`Tranzacții la ${station.name} (${txs.length})`}>
        <Card>
          <ul className="divide-y divide-slate-100">
            {txs.map((t) => {
              const car = cars.find((c) => c.id === t.carId)!;
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
                      <div className="font-semibold text-sm">{car.plate}</div>
                      <div className="text-xs text-slate-500">
                        {formatDateTime(t.date)} · {t.liters.toFixed(1)} L · {t.fuel}
                      </div>
                    </div>
                    <div className="font-bold text-sm">{formatLei(t.total)}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </Section>
    </AppShell>
  );
}
