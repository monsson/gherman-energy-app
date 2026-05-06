import { Link } from "react-router";
import { type Car, carHasExpiredDoc, getDriver } from "~/lib/data";

const SEGMENT_GLYPH: Record<Car["segment"], string> = {
  small: "🚗",
  utility: "🚐",
};

export function CarCard({ car, to }: { car: Car; to?: string }) {
  const expired = carHasExpiredDoc(car);
  const driver = getDriver(car.driverId);
  const target = to ?? `/car/${car.id}`;

  return (
    <Link
      to={target}
      className={`block bg-white rounded-2xl border shadow-sm p-3 active:scale-[0.99] transition ${
        expired ? "border-red-400 ring-1 ring-red-200" : "border-slate-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl ${
            expired ? "bg-red-50" : "bg-brand-50"
          }`}
        >
          {SEGMENT_GLYPH[car.segment]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">
              {car.brand} {car.model}
            </span>
            {expired && (
              <span className="text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                Expirat
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500 font-mono">{car.plate}</div>
          {driver && (
            <div className="text-xs text-slate-500 truncate">
              Card •••• {driver.cardNumber} · {driver.name}
            </div>
          )}
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-slate-300">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </Link>
  );
}
