import { Link } from "react-router";
import { AppShell, Card, Section } from "~/components/AppShell";
import { BarChart, LineChart } from "~/components/Charts";
import { CarCard } from "~/components/CarCard";
import { useSession } from "./auth-layout";
import {
  cars,
  carHasExpiredDoc,
  monthlyAggregate,
  stations,
  transactions,
} from "~/lib/data";
import { formatLei } from "~/lib/format";

export default function ManagerDashboard() {
  const session = useSession();
  const monthly = monthlyAggregate(transactions);

  const totalThisMonth = monthly[monthly.length - 1];
  const totalSpend = transactions.reduce((s, t) => s + t.total, 0);
  const totalLiters = transactions.reduce((s, t) => s + t.liters, 0);
  const totalKm = transactions.reduce((s, t) => s + t.kmDriven, 0);
  const avgConsumption = totalKm > 0 ? Math.round((totalLiters / totalKm) * 1000) / 10 : 0;

  const expiringCars = cars.filter(carHasExpiredDoc);

  return (
    <AppShell session={session} title="Salut, Fleet Manager">
      <Section title="Sumar 6 luni">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Total cheltuit" value={formatLei(totalSpend)} accent />
          <Stat label="Total litri" value={`${Math.round(totalLiters)} L`} />
          <Stat label="Distanță" value={`${totalKm.toLocaleString("ro-RO")} km`} />
          <Stat label="Consum mediu" value={`${avgConsumption} L/100km`} />
        </div>
      </Section>

      <Section title="Consum mediu (L/100km)">
        <Card className="p-3">
          <BarChart
            data={monthly.map((m) => ({ label: m.label, value: m.consumption }))}
            unit="L/100km"
            color="#10b981"
          />
        </Card>
      </Section>

      <Section title="Kilometri parcurși">
        <Card className="p-3">
          <LineChart
            data={monthly.map((m) => ({ label: m.label, value: m.km }))}
            unit="km"
            color="#f59e0b"
          />
        </Card>
      </Section>

      <Section
        title={`Mașini (${cars.length})`}
        action={
          <Link to="/manager/cars" className="text-sm font-semibold text-brand-700">
            Vezi toate →
          </Link>
        }
      >
        {expiringCars.length > 0 && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
            <strong>{expiringCars.length}</strong> mașini au documente expirate.
          </div>
        )}
        <div className="space-y-2">
          {cars.slice(0, 3).map((c) => (
            <CarCard key={c.id} car={c} to={`/car/${c.id}`} />
          ))}
        </div>
      </Section>

      <Section
        title="Tranzacții recente"
        action={
          <Link to="/manager/transactions" className="text-sm font-semibold text-brand-700">
            Vezi toate →
          </Link>
        }
      >
        <Card>
          <ul className="divide-y divide-slate-100">
            {transactions.slice(0, 5).map((t) => {
              const station = stations.find((s) => s.id === t.stationId)!;
              const car = cars.find((c) => c.id === t.carId)!;
              return (
                <li key={t.id} className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-lg">
                    ⛽
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {car.plate} · {station.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(t.date).toLocaleDateString("ro-RO")} · {t.liters.toFixed(1)} L
                    </div>
                  </div>
                  <div className="font-bold text-sm">{formatLei(t.total)}</div>
                </li>
              );
            })}
          </ul>
        </Card>
      </Section>

      <Section title="Stații">
        <Card>
          <ul className="divide-y divide-slate-100">
            {stations.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/manager/station/${s.id}`}
                  className="p-3 flex items-center gap-3 active:bg-slate-50"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-lg">
                    🏪
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{s.name}</div>
                    <div className="text-xs text-slate-500 truncate">{s.address}</div>
                  </div>
                  <div className="text-xs text-slate-500 text-right">
                    <div>B {s.petrolPrice.toFixed(2)}</div>
                    <div>M {s.dieselPrice.toFixed(2)}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </Section>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-3 border ${
        accent
          ? "bg-brand-600 text-white border-brand-600"
          : "bg-white text-slate-900 border-slate-100"
      }`}
    >
      <div className={`text-[11px] uppercase tracking-wider font-semibold ${accent ? "text-brand-100" : "text-slate-500"}`}>
        {label}
      </div>
      <div className="text-xl font-extrabold mt-0.5">{value}</div>
    </div>
  );
}
