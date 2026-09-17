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
 * Id-urile din `FurnizorCarburant` - de la cine s-a cumparat carburantul.
 *
 * Azi toate alimentarile si toate cardurile reale sunt `rompetrol`: prima etapa a integrarii
 * acopera doar FillAndGo. Campul exista ca lista sa nu devina ambigua in clipa in care intra si
 * extrasele MOL / Socar, si pentru ca un sofer cu doua carduri nu le poate deosebi dupa ultimele
 * patru cifre, singurul lucru care ajunge in browser.
 */
export type FuelSupplier = "rompetrol" | "mol" | "socar";

/** Enum-ul vine ca text; un id necunoscut nu are eticheta, deci nu are nici insigna. */
export function toFuelSupplier(id?: string): FuelSupplier | undefined {
  return id === "rompetrol" || id === "mol" || id === "socar" ? id : undefined;
}

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

/** Id-urile din `DocumentMasinaTip`. */
export type CarDocumentType = "itp" | "rca" | "rovinieta";

/**
 * Un rand din documentele masinii - documentul curent al unui tip sau o reinnoire dinaintea lui.
 *
 * `current` marcheaza randul de care raspunde masina acum: cel cu termenul cel mai indepartat din
 * tipul lui, aceeasi regula care da `car.itp` / `car.rca` / `car.rovinieta`.
 */
export type CarDocument = {
  id: string;
  type: CarDocumentType;
  /** `yyyy-MM-dd`. */
  issued?: string;
  expires?: string;
  current: boolean;
  /** Documentul a fost scanat. Singur, **nu** inseamna ca se poate descarca - vezi `canDownloadDoc`. */
  hasScan: boolean;
  fileName?: string;
  sizeBytes?: number;
};

/** Ce trimite ecranul la incarcarea unui scan. */
export type CarDocumentUpload = {
  carId: string;
  type: CarDocumentType;
  /** `yyyy-MM-dd`. */
  issued?: string;
  /** Obligatoriu: fara termen documentul nu ar fi niciodata cel curent, deci nu s-ar descarca. */
  expires: string;
  /** Cu tot cu extensie - ea decide daca fisierul este acceptat. */
  fileName: string;
  /** Continutul, fara prefixul de data URL. */
  contentBase64: string;
};

/**
 * `cardSupplier` exista numai in modul demo, ca ecranul de carduri sa arate la fel in ambele moduri;
 * in modul API acelasi ecran il ia din profil (`ProfilPwa.carduri[].furnizor`).
 *
 * `SoferPwa` nu poarta furnizorul si **nu are de ce sa il poarte**: furnizorul este al cardului, nu
 * al soferului. Un sofer are un singur cont si poate tine carduri de la mai multi furnizori - nu isi
 * face cate un cont de fiecare. In plus `cardMascat` este cardul *principal*, ales de `CarduriPwa`
 * dintre cardurile soferului, deci o insigna langa el ar spune "soferul asta alimenteaza la X" cand
 * de fapt spune doar "asa s-a sortat lista". Insigna sta unde un card e aratat ca un card - lista de
 * carduri din `/driver` - nu unde e aratat ca semn de identificare al unei persoane (antetul din
 * `car/:id`, selectul de sofer).
 */
export type Driver = { id: string; name: string; cardMasked?: string; cardSupplier?: FuelSupplier };

export type Transaction = {
  id: string;
  /** ISO, cu ora. */
  date?: string;
  carId?: string;
  plate?: string;
  driverId?: string;
  fuel?: FuelType;
  /** De la cine s-a alimentat. Lipseste doar pe un id de enum pe care frontendul nu il cunoaste. */
  supplier?: FuelSupplier;
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

/**
 * Termenele lipsesc dinadins: nu mai sunt campuri pe masina, ci se deduc din documente, iar
 * singura cale de a le schimba este incarcarea unui scan (`uploadCarDocument`).
 */
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
  listCarDocuments(carId: string): Promise<CarDocument[]>;
  downloadCarDocument(carId: string, type: CarDocumentType): Promise<void>;
  uploadCarDocument(input: CarDocumentUpload): Promise<Car>;
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
 * O singura functie exista numai in demo: adaugarea de alimentari a fost anulata prin planul de API,
 * alimentarile intra exclusiv prin importul din portal. Documentele masinii nu mai sunt aici -
 * exista in ambele moduri, iar cine le poate incarca tine de rol, nu de mod.
 */
export function capabilities() {
  const demo = !onApi();
  return { canAddTransaction: demo };
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
export async function listCarDocuments(carId: string) {
  return (await source()).listCarDocuments(carId);
}
export async function downloadCarDocument(carId: string, type: CarDocumentType) {
  return (await source()).downloadCarDocument(carId, type);
}
export async function uploadCarDocument(input: CarDocumentUpload) {
  return (await source()).uploadCarDocument(input);
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

/** Ordinea in care ecranul randeaza tipurile, indiferent ce documente exista. */
export const CAR_DOCUMENT_TYPES: CarDocumentType[] = ["itp", "rca", "rovinieta"];

export const DOCUMENT_LABEL: Record<CarDocumentType, string> = {
  itp: "ITP",
  rca: "RCA",
  rovinieta: "Rovinietă",
};

/**
 * Cand randul are cu adevarat un fisier de dat.
 *
 * Nu este acelasi lucru cu `hasScan`: se descarca **numai documentul curent**, deci pe un rand din
 * istoric scanul exista, dar API-ul nu are cale spre el. Un buton randat doar pe `hasScan` ar cere
 * un fisier pe care serverul il refuza.
 */
export function canDownloadDoc(doc: CarDocument): boolean {
  return doc.current && doc.hasScan;
}

/** Documentul curent al unui tip, daca exista. */
export function currentDoc(docs: CarDocument[], type: CarDocumentType): CarDocument | undefined {
  return docs.find((d) => d.type === type && d.current);
}

/** Reinnoirile dinaintea documentului curent, in ordinea primita de la server. */
export function docHistory(docs: CarDocument[], type: CarDocumentType): CarDocument[] {
  return docs.filter((d) => d.type === type && !d.current);
}

/** Ce accepta `incarcaDocumentMasina`; verificat si local, ca sa nu plece 10 MB degeaba. */
export const DOCUMENT_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"];

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

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

export const FUEL_SUPPLIER_LABEL: Record<FuelSupplier, string> = {
  rompetrol: "Rompetrol",
  mol: "MOL",
  socar: "Socar",
};

export const SEGMENT_LABEL: Record<Segment, string> = {
  mica: "Autoturism mic",
  autoutilitara: "Utilitară",
};
