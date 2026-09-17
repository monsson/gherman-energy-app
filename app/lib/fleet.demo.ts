// Adaptorul demo: datele din `data.ts`, invelite in promisiuni.
//
// Exista ca aplicatia sa mearga fara backend (publicarea de pe GitHub Pages). Reproduce si regulile
// pe care in modul API le impune serverul - vizibilitatea pe sofer, refuzul unui id inexistent,
// plafoanele de interval si de randuri - altfel ecranele s-ar comporta diferit intre moduri si
// demo-ul ar ascunde exact erorile pe care ar trebui sa le scoata la iveala.
//
// Se sterge in intregime cand modul demo iese din aplicatie.

import { getSession } from "./auth";
import {
  type CarDocumentRow,
  carDocuments,
  cars,
  drivers,
  invoices,
  nextCarId,
  refreshDerived,
  scanName,
  stations,
  transactions,
  upsertCarDocument,
} from "./data";
import { DEMO_SUPPLIER } from "./data";
import { downloadBase64 } from "./download";
import { downloadPdf } from "./pdf";
import { formatDate, formatLei } from "./format";
import {
  DOCUMENT_EXTENSIONS,
  DOCUMENT_LABEL,
  DOCUMENT_MAX_BYTES,
  type Car,
  type CarDetail,
  type CarDocument,
  type CarDocumentType,
  type CarDocumentUpload,
  type CarInput,
  type FleetSource,
  type InvoiceDetail,
  type MonthSummary,
  type Station,
  type Transaction,
  type TransactionFilter,
} from "./fleet";

/** Soferul contului demo. Un manager nu are, deci vede toata flota. */
function currentDriverId(): string | undefined {
  return getSession()?.driverId;
}

function visibleCars(): Car[] {
  const driverId = currentDriverId();
  return driverId ? cars.filter((c) => c.driverId === driverId) : cars;
}

/** Refuz, nu rezultat gol - la fel ca `MasiniVizibilePwa`. */
function requireCar(id: string): Car {
  const car = visibleCars().find((c) => c.id === id);
  if (!car) throw new Error("Mașina nu este accesibilă utilizatorului autentificat.");
  return car;
}

/** Acelasi plafon ca in `PwaFlotaServiceBean`, ca ecranele sa intalneasca trunchierea si in demo. */
const MAX_TRANSACTIONS = 1000;

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

/** Documentul curent al unui tip: `max(expires)`, aceeasi regula ca `documentCurent` in backend. */
function currentDocumentRow(carId: string, type: CarDocumentType): CarDocumentRow | undefined {
  return carDocuments
    .filter((d) => d.carId === carId && d.type === type && d.expires)
    .reduce<CarDocumentRow | undefined>(
      (best, d) => (!best || d.expires > best.expires ? d : best),
      undefined,
    );
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/** Dimensiunea dupa decodare, calculata din textul base64 - ca in serviciu, fara sa-l decodeze. */
function decodedSize(base64: string): number {
  const text = base64.trim().replace(/=+$/, "");
  return Math.floor((text.length * 3) / 4);
}

export const demoSource: FleetSource = {
  async listCars() {
    return visibleCars().map((c) => ({ ...c }));
  },

  async getCar(id: string): Promise<CarDetail> {
    const car = requireCar(id);
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

  /**
   * Documentele masinii, in ordinea serverului: pe tip, iar in interiorul tipului de la termenul cel
   * mai indepartat spre cel mai vechi. Primul rand al unui tip este documentul curent.
   */
  async listCarDocuments(carId: string): Promise<CarDocument[]> {
    requireCar(carId);

    const rows = carDocuments
      .filter((d) => d.carId === carId && d.expires)
      .sort((a, b) =>
        a.type === b.type ? (a.expires < b.expires ? 1 : -1) : a.type < b.type ? -1 : 1,
      );

    const seen = new Set<CarDocumentType>();
    return rows.map((d) => {
      // `current` se deduce din ordonare, ca in backend: primul rand al tipului este cel curent.
      const current = !seen.has(d.type);
      seen.add(d.type);
      return {
        id: d.id,
        type: d.type,
        issued: d.issued,
        expires: d.expires,
        current,
        hasScan: d.hasScan,
        fileName: d.fileName,
        sizeBytes: d.sizeBytes,
      };
    });
  },

  /**
   * Se descarca numai documentul curent, iar cele doua lipsuri au mesaje diferite - la fel ca
   * `PwaFlotaServiceBean`, ca ecranul sa poata spune "expiră la …, fără document" in loc de
   * "nu există".
   */
  async downloadCarDocument(carId: string, type: CarDocumentType) {
    const car = requireCar(carId);
    const current = currentDocumentRow(carId, type);

    if (!current) {
      throw new Error(`Mașina ${car.plate} nu are un document de tip ${DOCUMENT_LABEL[type]}.`);
    }
    if (!current.hasScan) {
      throw new Error(
        `Documentul ${DOCUMENT_LABEL[type]} al mașinii ${car.plate} nu are încă un scan încărcat.`,
      );
    }

    const name = current.fileName ?? scanName(car, type, current.expires);

    // Scanul incarcat in sesiunea curenta se intoarce asa cum a venit; pentru documentele generate
    // - si pentru cele incarcate inaintea unui refresh, al caror continut nu se salveaza - se
    // fabrica un PDF fictiv, ca butonul sa livreze totusi ceva.
    if (current.contentBase64) {
      downloadBase64(name, current.contentBase64);
      return;
    }

    downloadPdf(name, `${DOCUMENT_LABEL[type].toUpperCase()} (document fictiv - prototip GE)`, [
      `Numar inmatriculare: ${car.plate}`,
      `Marca / Model: ${[car.brand, car.model].filter(Boolean).join(" ")}`,
      "Detinator: GHERMAN ENERGY SRL",
      "",
      `Data emiterii: ${current.issued ? formatDate(current.issued) : "-"}`,
      `Valabil pana la: ${formatDate(current.expires)}`,
    ]);
  },

  /** Doar managerul scrie; restul verificarilor sunt cele din `DocumenteMasinaPwa`. */
  async uploadCarDocument(input: CarDocumentUpload): Promise<Car> {
    // Refuzul de rol vine inaintea oricarei citiri, ca in serviciu.
    if (currentDriverId()) {
      throw new Error("Doar un manager de flotă poate încărca documentele mașinilor.");
    }

    const car = requireCar(input.carId);
    const extension = extensionOf(input.fileName);

    if (!DOCUMENT_EXTENSIONS.includes(extension)) {
      throw new Error(`Documentul trebuie să fie unul dintre: ${DOCUMENT_EXTENSIONS.join(", ")}.`);
    }
    if (!input.expires) {
      throw new Error("Termenul de expirare este obligatoriu.");
    }
    if (input.issued && input.issued > input.expires) {
      throw new Error("Data emiterii nu poate fi după data expirării.");
    }

    const sizeBytes = decodedSize(input.contentBase64);
    if (sizeBytes === 0) throw new Error("Conținutul documentului lipsește.");
    if (sizeBytes > DOCUMENT_MAX_BYTES) {
      throw new Error(`Documentul depășește ${DOCUMENT_MAX_BYTES / (1024 * 1024)} MB.`);
    }

    // Randul se cauta dupa (masina, tip, termen): acelasi termen inlocuieste scanul, unul diferit
    // este o reinnoire. Numele este cel compus de server, nu cel dat de telefon.
    upsertCarDocument({
      carId: car.id,
      type: input.type,
      issued: input.issued,
      expires: input.expires,
      hasScan: true,
      fileName: scanName(car, input.type, input.expires, extension),
      sizeBytes,
      contentBase64: input.contentBase64,
    });

    // Termenele masinii se reasaza din documente, ca in backend.
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
