import { Link, useParams } from "react-router";
import { AppShell, Card, Section } from "~/components/AppShell";
import {
  getCar,
  getDriver,
  isExpired,
  stations,
  transactionsForCar,
} from "~/lib/data";
import { formatDate, formatDateTime, formatLei } from "~/lib/format";
import { downloadPdf } from "~/lib/pdf";
import { useSession } from "./auth-layout";

export default function CarDetail() {
  const session = useSession();
  const { id } = useParams();
  const car = getCar(Number(id));
  const back = session.role === "manager" ? "/manager/cars" : "/driver";

  if (!car) {
    return (
      <AppShell session={session} title="Mașină" back={back}>
        <p className="text-center text-slate-500 py-12">Mașină inexistentă.</p>
      </AppShell>
    );
  }

  const driver = getDriver(car.driverId);
  const txs = transactionsForCar(car.id);
  const totalLiters = txs.reduce((s, t) => s + t.liters, 0);
  const totalSpend = txs.reduce((s, t) => s + t.total, 0);
  const totalKm = txs.reduce((s, t) => s + t.kmDriven, 0);
  const consumption = totalKm > 0 ? Math.round((totalLiters / totalKm) * 1000) / 10 : 0;

  function handleDownloadTalon() {
    downloadPdf(
      `talon-${car!.plate}.pdf`,
      "CERTIFICAT DE INMATRICULARE",
      [
        "(Document fictiv - prototip GE)",
        "",
        `Numar inmatriculare: ${car!.plate}`,
        `Marca: ${car!.brand}`,
        `Model: ${car!.model}`,
        `An fabricatie: ${car!.year}`,
        `Tip combustibil: ${car!.fuel}`,
        `Sofer asignat: ${driver?.name ?? "-"}`,
        "",
        "ITP valabil pana la: " + formatDate(car!.itp),
        "Detinator: GHERMAN ENERGY SRL",
      ],
    );
  }

  function handleDownloadInsurance() {
    downloadPdf(
      `asigurare-${car!.plate}.pdf`,
      "POLITA RCA",
      [
        "(Document fictiv - prototip GE)",
        "",
        `Numar inmatriculare: ${car!.plate}`,
        `Marca / Model: ${car!.brand} ${car!.model}`,
        `Asigurat: GHERMAN ENERGY SRL`,
        `Polita nr: GE-${String(car!.id).padStart(6, "0")}`,
        "",
        "Valabila de la: " + formatDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()),
        "Valabila pana la: " + formatDate(car!.rca),
      ],
    );
  }

  return (
    <AppShell session={session} title={`${car.brand} ${car.model}`} back={back}>
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center text-5xl">
            {car.segment === "small" ? "🚗" : "🚐"}
          </div>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-widest font-bold text-slate-500">
              {car.segment === "small" ? "Autoturism mic" : "Utilitară mică"}
            </div>
            <div className="text-xl font-extrabold">
              {car.brand} {car.model}
            </div>
            <div className="font-mono text-slate-600">{car.plate}</div>
            <div className="text-xs text-slate-500">
              An {car.year} · {car.fuel}
            </div>
          </div>
        </div>
        {driver && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">Șofer</span>
            <span className="font-semibold">
              {driver.name} · card •••• {driver.cardNumber}
            </span>
          </div>
        )}
      </Card>

      <Section title="Documente">
        <div className="space-y-2">
          <DocRow label="ITP" date={car.itp} />
          <DocRow label="RCA" date={car.rca} />
          <DocRow label="Rovignetă" date={car.rovigneta} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={handleDownloadTalon}
            className="bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold flex items-center justify-center gap-2 active:bg-slate-50"
          >
            📄 Talon
          </button>
          <button
            onClick={handleDownloadInsurance}
            className="bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold flex items-center justify-center gap-2 active:bg-slate-50"
          >
            📑 Asigurare
          </button>
        </div>
      </Section>

      <Section title="Sumar consum">
        <Card className="p-4 grid grid-cols-2 gap-3">
          <KV label="Total cheltuit" value={formatLei(totalSpend)} accent />
          <KV label="Total litri" value={`${Math.round(totalLiters)} L`} />
          <KV label="Distanță" value={`${totalKm.toLocaleString("ro-RO")} km`} />
          <KV label="Consum mediu" value={`${consumption} L/100km`} />
        </Card>
      </Section>

      <Section title={`Tranzacții (${txs.length})`}>
        <Card>
          <ul className="divide-y divide-slate-100">
            {txs.map((t) => {
              const station = stations.find((s) => s.id === t.stationId)!;
              return (
                <li key={t.id}>
                  <Link
                    to={
                      session.role === "manager"
                        ? `/manager/station/${station.id}`
                        : `/car/${car.id}`
                    }
                    className="p-3 flex items-center gap-3 active:bg-slate-50"
                    onClick={(e) => {
                      if (session.role !== "manager") e.preventDefault();
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-lg">
                      ⛽
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{station.name}</div>
                      <div className="text-xs text-slate-500">
                        {formatDateTime(t.date)} · {t.liters.toFixed(1)} L · {t.kmDriven} km
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
      </Section>
    </AppShell>
  );
}

function DocRow({ label, date }: { label: string; date: string }) {
  const expired = isExpired(date);
  return (
    <div
      className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
        expired ? "bg-red-50 border-red-200" : "bg-white border-slate-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
            expired ? "bg-red-100 text-red-700" : "bg-brand-50 text-brand-700"
          }`}
        >
          {expired ? "!" : "✓"}
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
            {label}
          </div>
          <div className={`font-bold ${expired ? "text-red-700" : "text-slate-900"}`}>
            {formatDate(date)}
          </div>
        </div>
      </div>
      <div
        className={`text-[11px] uppercase font-bold tracking-wider ${
          expired ? "text-red-700" : "text-emerald-700"
        }`}
      >
        {expired ? "Expirat" : "Valabil"}
      </div>
    </div>
  );
}

function KV({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl p-3 ${
        accent ? "bg-brand-600 text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      <div
        className={`text-[11px] uppercase tracking-wider font-bold ${
          accent ? "text-brand-100" : "text-slate-500"
        }`}
      >
        {label}
      </div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}
