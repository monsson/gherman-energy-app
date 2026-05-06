import { Link, Navigate } from "react-router";
import { AppShell, Card, Section } from "~/components/AppShell";
import { CarCard } from "~/components/CarCard";
import {
  cars,
  getDriver,
  promotions,
  stations,
  topCheapStations,
  transactionsForDriver,
} from "~/lib/data";
import { formatDateTime, formatLei } from "~/lib/format";
import { useSession } from "./auth-layout";

export default function DriverDashboard() {
  const session = useSession();
  if (!session.driverId) return <Navigate to="/" replace />;

  const driver = getDriver(session.driverId);
  if (!driver) return <Navigate to="/" replace />;

  const driverCar = cars.find((c) => c.driverId === driver.id);
  const last3 = transactionsForDriver(driver.id).slice(0, 3);
  const top3 = topCheapStations();
  const limitPct = Math.min(100, Math.round((driver.used / driver.limit) * 100));

  return (
    <AppShell session={session} title={`Bună, ${driver.name.split(" ")[0]}`}>
      <Section title="Cardul meu">
        <Card className="p-4 bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 text-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[11px] uppercase tracking-widest font-bold text-brand-100">
                GE Fleet Card
              </div>
              <div className="text-lg font-bold">{driver.name}</div>
            </div>
            <div className="text-2xl">💳</div>
          </div>
          <div className="font-mono text-xl tracking-widest">
            •••• •••• •••• {driver.cardNumber}
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs font-semibold text-brand-100 mb-1">
              <span>Limită lunară</span>
              <span>
                {formatLei(driver.used)} / {formatLei(driver.limit)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-amber-300 rounded-full"
                style={{ width: `${limitPct}%` }}
              />
            </div>
          </div>
        </Card>
      </Section>

      {driverCar && (
        <Section title="Mașina mea">
          <CarCard car={driverCar} />
        </Section>
      )}

      <Section title="Ultimele 3 alimentări">
        <Card>
          {last3.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Nicio alimentare încă.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {last3.map((t) => {
                const station = stations.find((s) => s.id === t.stationId)!;
                return (
                  <li key={t.id} className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-lg">
                      ⛽
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{station.name}</div>
                      <div className="text-xs text-slate-500">
                        {formatDateTime(t.date)} · {t.liters.toFixed(1)} L
                      </div>
                    </div>
                    <div className="font-bold text-sm">{formatLei(t.total)}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </Section>

      <Section title="Top 3 prețuri în județ">
        <div className="grid grid-cols-1 gap-2">
          {top3.map((s, i) => (
            <Card key={s.id} className="p-3 flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-white ${
                  i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : "bg-amber-700"
                }`}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{s.name}</div>
                <div className="text-xs text-slate-500 truncate">{s.address}</div>
              </div>
              <div className="text-right text-xs">
                <div>
                  <span className="text-slate-500">B </span>
                  <strong>{s.petrolPrice.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">M </span>
                  <strong>{s.dieselPrice.toFixed(2)}</strong>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Promoții pentru tine">
        <div className="space-y-2">
          {promotions.map((p) => (
            <Card key={p.id} className="p-3 flex items-start gap-3 border-l-4 border-l-amber-400">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-lg shrink-0">
                🎁
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{p.title}</div>
                <div className="text-xs text-slate-600">{p.detail}</div>
                <div className="text-[11px] text-brand-700 font-semibold mt-1">
                  la {p.stationName}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <div className="mt-6">
        <Link
          to="/"
          className="block text-center text-xs text-slate-400"
          onClick={(e) => e.preventDefault()}
        >
          GE Fleet · prototip
        </Link>
      </div>
    </AppShell>
  );
}
