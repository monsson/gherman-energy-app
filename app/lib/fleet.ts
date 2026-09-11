// Stratul de domeniu.
//
// Singurul modul din care citesc ecranele. Dedesubt sunt doua adaptoare cu aceeasi semnatura -
// `fleet.api.ts` (serviciile CUBA) si `fleet.demo.ts` (datele din `data.ts`) - iar facada alege
// intre ele dupa sesiunea curenta. Asa niciun ecran nu are ramura pe mod, iar cand modul demo
// dispare se sterge un fisier, nu se reface fiecare pagina.
//
// Numele sunt englezesti, ca pana acum in interfata; formele romanesti raman in `api.ts`, unde
// oglindesc DTO-urile. Traducerea se face o singura data, in adaptorul de API.

import { getSession } from "./auth";
import { API_ENABLED } from "./api";

// ---------------------------------------------------------------- tipuri

/** Id-urile din `TipCarburant`. `gpl` exista in alimentari, nu in nomenclatorul de masini. */
export type FuelType = "benzina" | "motorina" | "gpl";

/** Id-urile din `SegmentAuto`. */
export type Segment = "mica" | "autoutilitara";

/**
 * Aproape totul este optional: serverul **omite campurile null** din JSON, iar pe datele reale
 * marca, modelul, segmentul si documentele lipsesc la majoritatea masinilor.
 */
export type Car = {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  segment?: Segment;
  fuel?: FuelType;
  driverId?: string;
  driverName?: string;
  /** `yyyy-MM-dd`. */
  itp?: string;
  rca?: string;
  rovinieta?: string;
  /** Plafonul lunar, **in litri**, pe masina. Sub un litru inseamna vehicul barat la alimentare. */
  limitLiters?: number;
  /** Consumul lunii curente. Zero este un raspuns adevarat, nu o lipsa de date. */
  usedLiters?: number;
  usedLei?: number;
};

export type CarDetail = Car & { driverCardMasked?: string };

export type Driver = { id: string; name: string; cardMasked?: string };

export type Transaction = {
  id: string;
  /** ISO, cu ora. */
  date?: string;
  carId?: string;
  plate?: string;
  driverId?: string;
  fuel?: FuelType;
  liters?: number;
  pricePerLiter?: number;
  total?: number;
  /** Lipseste cand importul nu a potrivit statia - `stationName` ramane, deci linkul e conditionat. */
  stationId?: string;
  stationName?: string;
  odometer?: number;
  kmDriven?: number;
  invoiceRef?: string;
};

export type MonthSummary = {
  /** `yyyy-MM`. */
  month: string;
  liters: number;
  km: number;
  /** `null` cand luna nu are distanta - un zero s-ar desena ca un consum real de zero. */
  consumption: number | null;
  total: number;
};

export type Station = {
  id: string;
  name: string;
  address?: string;
  petrolPrice?: number;
  dieselPrice?: number;
  /** Se afiseaza, ca preturile sa nu para live de la pompa. */
  priceUpdatedAt?: string;
};

export type Invoice = {
  id: string;
  number: string;
  date?: string;
  dueDate?: string;
  subtotal?: number;
  vat?: number;
  total?: number;
  /** Ce a mai ramas de plata. Statusul se deriva din el. */
  balance?: number;
  status: "paid" | "unpaid";
};

export type InvoiceLine = {
  no?: number;
  name?: string;
  cnt?: number;
  unit?: string;
  priceNoVat?: number;
  totalNoVat?: number;
  totalWithVat?: number;
};

/** Emitentul facturii. Pe o factura client suntem noi, nu furnizorul de carburant. */
export type Supplier = { name?: string; cui?: string; address?: string };

export type InvoiceDetail = { invoice: Invoice; supplier?: Supplier; lines: InvoiceLine[] };

export type CarInput = {
  /** Gol = masina noua. */
  id?: string;
  plate: string;
  brand: string;
  model: string;
  year?: number;
  segment?: Segment;
  fuel?: FuelType;
  driverId?: string;
  itp?: string;
  rca?: string;
  rovinieta?: string;
};

export type TransactionFilter = {
  carId?: string;
  stationId?: string;
  driverId?: string;
  /** `yyyy-MM-dd`. Fara ele serverul acopera doar ultimele 30 de zile. */
  from?: string;
  to?: string;
  limit?: number;
};

/** Ce trebuie sa implementeze amandoua adaptoarele. */
export type FleetSource = {
  listCars(): Promise<Car[]>;
  getCar(id: string): Promise<CarDetail>;
  listDrivers(): Promise<Driver[]>;
  saveCar(input: CarInput): Promise<Car>;
  listTransactions(filter: TransactionFilter): Promise<Transaction[]>;
  monthlySummary(carId?: string, months?: number): Promise<MonthSummary[]>;
  listStations(): Promise<Station[]>;
  getStation(id: string): Promise<Station>;
  cheapStations(fuel?: "benzina" | "motorina", limit?: number): Promise<Station[]>;
  listInvoices(from?: string, to?: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<InvoiceDetail>;
  invoiceTransactions(id: string): Promise<Transaction[]>;
  downloadInvoice(id: string): Promise<void>;
};

// ---------------------------------------------------------------- mod si capabilitati

/** `true` cand ecranele citesc din backend. Sesiunea decide, nu doar variabila de mediu. */
export function onApi(): boolean {
  const session = getSession();
  return session ? session.source === "api" : API_ENABLED;
}

/**
 * Ce poate aplicatia in modul curent, intr-un singur loc.
 *
 * Doua functii exista numai in demo: adaugarea de alimentari a fost anulata prin planul de API
 * (alimentarile intra exclusiv prin importul din portal), iar documentele masinii nu au inca un
 * endpoint - `getDocumentMasina` este amanat pana exista unde sa fie tinute fisierele.
 */
export function capabilities() {
  const demo = !onApi();
  return { canAddTransaction: demo, hasCarDocuments: demo };
}

// ---------------------------------------------------------------- ajutoare de data

/** `yyyy-MM-dd` pentru acum N zile. */
export function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Ultimele N alimentari, indiferent cand au fost.
 *
 * `getTranzactii` fara date acopera implicit doar ultimele 30 de zile, deci "ultimele 3" cerute
 * fara interval ies goale pe o masina care nu a alimentat luna asta. Un an in urma este maximul
 * admis (366 de zile).
 */
export function recent(filter: Omit<TransactionFilter, "from" | "to">): Promise<Transaction[]> {
  return listTransactions({ ...filter, from: daysAgo(365) });
}

// ---------------------------------------------------------------- facada

let _api: FleetSource | null = null;
let _demo: FleetSource | null = null;

// Import lenes, ca bundle-ul modului demo sa nu fie incarcat de o sesiune pe API si invers.
async function source(): Promise<FleetSource> {
  if (onApi()) {
    _api ??= (await import("./fleet.api")).apiSource;
    return _api;
  }
  _demo ??= (await import("./fleet.demo")).demoSource;
  return _demo;
}

export async function listCars() {
  return (await source()).listCars();
}
export async function getCar(id: string) {
  return (await source()).getCar(id);
}
export async function listDrivers() {
  return (await source()).listDrivers();
}
export async function saveCar(input: CarInput) {
  return (await source()).saveCar(input);
}
export async function listTransactions(filter: TransactionFilter = {}) {
  return (await source()).listTransactions(filter);
}
export async function monthlySummary(carId?: string, months?: number) {
  return (await source()).monthlySummary(carId, months);
}
export async function listStations() {
  return (await source()).listStations();
}
export async function getStation(id: string) {
  return (await source()).getStation(id);
}
export async function cheapStations(fuel?: "benzina" | "motorina", limit?: number) {
  return (await source()).cheapStations(fuel, limit);
}
export async function listInvoices(from?: string, to?: string) {
  return (await source()).listInvoices(from, to);
}
export async function getInvoice(id: string) {
  return (await source()).getInvoice(id);
}
export async function invoiceTransactions(id: string) {
  return (await source()).invoiceTransactions(id);
}
export async function downloadInvoice(id: string) {
  return (await source()).downloadInvoice(id);
}

// ---------------------------------------------------------------- reguli de afisare

/** Un document lipsa nu este expirat: nu se stie, ceea ce arata altfel pe ecran. */
export function isExpired(date?: string): boolean {
  return date != null && new Date(date).getTime() < Date.now();
}

export function carHasExpiredDoc(car: Car): boolean {
  return isExpired(car.itp) || isExpired(car.rca) || isExpired(car.rovinieta);
}

/**
 * Sub un litru plafonul nu este o alocatie, ci o blocare: portalul foloseste o valoare simbolica
 * (`0.01`, `1.00`) ca sa bareze vehiculul de la alimentare, iar niciuna dintre cele 69 de masini
 * din grupa asta nu a mai alimentat. Afisat ca procent ar da o bara la ~98 000%.
 */
export function isBlocked(car: Car): boolean {
  return car.limitLiters != null && car.limitLiters <= 1;
}

/** Pragul de la care o masina merita privita: aproape de plafon, dar inca sub el. */
export const NEAR_LIMIT = 0.8;

/**
 * Cat din plafonul lunar s-a consumat, ca raport. `null` cand masina nu are un plafon real - fie
 * nu are niciunul, fie are o valoare de blocare sub un litru, care nu este o alocatie si nu se
 * raporteaza la nimic.
 */
export function usageRatio(car: Car): number | null {
  if (car.limitLiters == null || car.limitLiters <= 1) return null;
  return (car.usedLiters ?? 0) / car.limitLiters;
}

export function isNearLimit(car: Car): boolean {
  const ratio = usageRatio(car);
  return ratio != null && ratio >= NEAR_LIMIT;
}

export const FUEL_LABEL: Record<FuelType, string> = {
  benzina: "Benzină",
  motorina: "Motorină",
  gpl: "GPL",
};

export const SEGMENT_LABEL: Record<Segment, string> = {
  mica: "Autoturism mic",
  autoutilitara: "Utilitară",
};
