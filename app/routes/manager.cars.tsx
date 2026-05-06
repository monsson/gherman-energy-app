import { useState } from "react";
import { AppShell } from "~/components/AppShell";
import { CarCard } from "~/components/CarCard";
import { cars, carHasExpiredDoc } from "~/lib/data";
import { useSession } from "./auth-layout";

export default function ManagerCarsRoute() {
  const session = useSession();
  const [filter, setFilter] = useState<"all" | "expired" | "small" | "utility">("all");

  const filtered = cars.filter((c) => {
    if (filter === "expired") return carHasExpiredDoc(c);
    if (filter === "small") return c.segment === "small";
    if (filter === "utility") return c.segment === "utility";
    return true;
  });

  return (
    <AppShell session={session} title="Toate mașinile">
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-3">
        {(
          [
            ["all", `Toate (${cars.length})`],
            ["expired", `Expirate (${cars.filter(carHasExpiredDoc).length})`],
            ["small", "Mici"],
            ["utility", "Utilitare"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold border ${
              filter === k
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((c) => (
          <CarCard key={c.id} car={c} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-slate-400 py-12 text-sm">Nicio mașină în filtru.</div>
        )}
      </div>
    </AppShell>
  );
}
