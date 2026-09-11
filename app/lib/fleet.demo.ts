// Adaptorul demo: datele din `data.ts`, invelite in promisiuni.
//
// Exista ca aplicatia sa mearga fara backend (publicarea de pe GitHub Pages). Reproduce si regulile
// pe care in modul API le impune serverul - vizibilitatea pe sofer, refuzul unui id inexistent,
// plafoanele de interval si de randuri - altfel ecranele s-ar comporta diferit intre moduri si
// demo-ul ar ascunde exact erorile pe care ar trebui sa le scoata la iveala.
//
// Se sterge in intregime cand modul demo iese din aplicatie.

import { getSession } from "./auth";
import { cars, drivers, invoices, nextCarId, refreshDerived, stations, transactions } from "./data";
import { DEMO_SUPPLIER } from "./data";
import { downloadPdf } from "./pdf";
import { formatDate, formatLei } from "./format";
import type {
  Car,
  CarDetail,
  CarInput,
  FleetSource,
  InvoiceDetail,
  MonthSummary,
  Station,
  Transaction,
  TransactionFilter,
} from "./fleet";

/** Soferul contului demo. Un manager nu are, deci vede toata flota. */
function currentDriverId(): string | undefined {
  return getSession()?.driverId;
}

function visibleCars(): Car[] {
  const driverId = currentDriverId();
  return driverId ? cars.filter((c) => c.driverId === driverId) : cars;
}

/** Acelasi plafon ca in `PwaFlotaServiceBean`, ca ecranele sa intalneasca trunchierea si in demo. */
const MAX_TRANSACTIONS = 1000;

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export const demoSource: FleetSource = {
  async listCars() {
    return visibleCars().map((c) => ({ ...c }));
  },

  async getCar(id: string): Promise<CarDetail> {
    const car = visibleCars().find((c) => c.id === id);
    // Refuz, nu rezultat gol - la fel ca `MasiniVizibilePwa`.
    if (!car) throw new Error("Mașina nu este accesibilă utilizatorului autentificat.");
    const driver = drivers.find((d) => d.id === car.driverId);
    return { ...car, driverCardMasked: driver?.cardMasked };
  },

  async listDrivers() {
    const driverId = currentDriverId();
    const list = driverId ? drivers.filter((d) => d.id === driverId) : drivers;
    return list.map((d) => ({ ...d }));
  },

  async saveCar(input: CarInput) {
    const existing = input.id ? cars.find((c) => c.id === input.id) : undefined;
    if (input.id && !existing) throw new Error("Mașină inexistentă.");

    const driver = drivers.find((d) => d.id === input.driverId);
    const values = {
      plate: input.plate,
      brand: input.brand,
      model: input.model,
      year: input.year,
      segment: input.segment,
      fuel: input.fuel,
      driverId: input.driverId,
      driverName: driver?.name,
      itp: input.itp,
      rca: input.rca,
      rovinieta: input.rovinieta,
    };

    if (existing) {
      Object.assign(existing, values);
      refreshDerived();
      return { ...existing };
    }

    const car: Car = { id: nextCarId(), usedLiters: 0, usedLei: 0, limitLiters: 400, ...values };
    cars.push(car);
    refreshDerived();
    return { ...car };
  },

  async listTransactions(filter: TransactionFilter) {
    const driverId = filter.driverId ?? currentDriverId();
    const visible = new Set(visibleCars().map((c) => c.id));

    let list = transactions.filter((t) => {
      if (t.carId && !visible.has(t.carId)) return false;
      if (filter.carId && t.carId !== filter.carId) return false;
      if (filter.stationId && t.stationId !== filter.stationId) return false;
      if (driverId && t.driverId !== driverId) return false;
      if (filter.from && (t.date ?? "") < filter.from) return false;
      // `to` este o zi, iar data poarta si ora: se compara pe prefixul de 10 caractere.
      if (filter.to && (t.date ?? "").slice(0, 10) > filter.to) return false;
      return true;
    });

    list = list.sort((a, b) => ((a.date ?? "") < (b.date ?? "") ? 1 : -1));
    const limit = Math.min(filter.limit ?? MAX_TRANSACTIONS, MAX_TRANSACTIONS);
    return list.slice(0, limit).map((t) => ({ ...t }));
  },

  async monthlySummary(carId?: string, months = 6): Promise<MonthSummary[]> {
    const visible = new Set(visibleCars().map((c) => c.id));
    const list = transactions.filter(
      (t) => (!carId || t.carId === carId) && (!t.carId || visible.has(t.carId)),
    );

    const buckets = new Map<string, { liters: number; km: number; total: number }>();
    for (const t of list) {
      if (!t.date) continue;
      const key = monthKey(t.date);
      const b = buckets.get(key) ?? { liters: 0, km: 0, total: 0 };
      b.liters += t.liters ?? 0;
      b.km += t.kmDriven ?? 0;
      b.total += t.total ?? 0;
      buckets.set(key, b);
    }

    const out: MonthSummary[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const b = buckets.get(key) ?? { liters: 0, km: 0, total: 0 };
      out.push({
        month: key,
        liters: Math.round(b.liters * 10) / 10,
        km: Math.round(b.km),
        consumption: b.km > 0 ? Math.round((b.liters / b.km) * 1000) / 10 : null,
        total: Math.round(b.total * 100) / 100,
      });
    }
    return out;
  },

  async listStations() {
    return stations.map((s) => ({ ...s }));
  },

  async getStation(id: string) {
    const station = stations.find((s) => s.id === id);
    if (!station) throw new Error("Stație inexistentă.");
    return { ...station };
  },

  async cheapStations(fuel?: "benzina" | "motorina", limit = 3) {
    const price = (s: Station) =>
      fuel === "benzina"
        ? s.petrolPrice
        : fuel === "motorina"
          ? s.dieselPrice
          : (s.petrolPrice ?? 0) + (s.dieselPrice ?? 0);
    return stations
      .filter((s) => (fuel === "benzina" ? s.petrolPrice != null : fuel === "motorina" ? s.dieselPrice != null : s.petrolPrice != null && s.dieselPrice != null))
      .sort((a, b) => (price(a) ?? 0) - (price(b) ?? 0))
      .slice(0, limit)
      .map((s) => ({ ...s }));
  },

  async listInvoices(from?: string, to?: string) {
    // Facturile sunt date comerciale ale partenerului: un sofer primeste 400 in modul API.
    if (currentDriverId()) throw new Error("Doar un manager de flotă are acces la facturi.");
    return invoices
      .filter((f) => (!from || (f.invoice.date ?? "") >= from) && (!to || (f.invoice.date ?? "") <= to))
      .map((f) => ({ ...f.invoice }));
  },

  async getInvoice(id: string): Promise<InvoiceDetail> {
    if (currentDriverId()) throw new Error("Doar un manager de flotă are acces la facturi.");
    const found = invoices.find((f) => f.invoice.id === id);
    if (!found) throw new Error("Factură inexistentă.");
    return { invoice: { ...found.invoice }, supplier: { ...DEMO_SUPPLIER }, lines: found.lines };
  },

  async invoiceTransactions(id: string): Promise<Transaction[]> {
    const found = invoices.find((f) => f.invoice.id === id);
    if (!found) return [];
    const ids = new Set(found.txIds);
    return transactions.filter((t) => ids.has(t.id)).map((t) => ({ ...t }));
  },

  async downloadInvoice(id: string) {
    const found = invoices.find((f) => f.invoice.id === id);
    if (!found) throw new Error("Factură inexistentă.");
    const f = found.invoice;
    downloadPdf(`factura-${f.number}.pdf`, "FACTURA FISCALA", [
      `Numar factura: ${f.number}`,
      `Data emiterii: ${f.date ? formatDate(f.date) : "-"}`,
      `Data scadentei: ${f.dueDate ? formatDate(f.dueDate) : "-"}`,
      "",
      "FURNIZOR",
      DEMO_SUPPLIER.name,
      `CUI: ${DEMO_SUPPLIER.cui}`,
      DEMO_SUPPLIER.address,
      "",
      ...found.lines.map((l) => `${l.name}: ${l.cnt} ${l.unit} - ${formatLei(l.totalWithVat ?? 0)}`),
      "",
      `Subtotal (fara TVA): ${formatLei(f.subtotal ?? 0)}`,
      `TVA 19%: ${formatLei(f.vat ?? 0)}`,
      `Total de plata: ${formatLei(f.total ?? 0)}`,
      "",
      `Status: ${f.status === "paid" ? "ACHITATA" : "NEACHITATA"}`,
      "",
      "(Document fictiv - prototip GE)",
    ]);
  },
};
