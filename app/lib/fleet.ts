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

/** Id-urile din `PerioadaLimita` - care dintre cele trei plafoane ale vehiculului. */
export type LimitPeriod = "lunara" | "saptamanala" | "zilnica";

/** Ordinea in care ecranele randeaza plafoanele, indiferent care dintre ele exista. */
export const LIMIT_PERIODS: LimitPeriod[] = ["lunara", "saptamanala", "zilnica"];

/** Id-urile din `StareCerereLimita`. Pe masina ajung numai `ceruta` si `trimisa`. */
export type LimitRequestState = "ceruta" | "trimisa" | "confirmata" | "respinsa";

/** De unde vine pretul folosit la estimare, de la cel mai apropiat de masina catre cel mai departat. */
export type LeiEstimateSource = "masina_luna_curenta" | "masina_istoric" | "partener_istoric";

/**
 * Cat ar costa plafonul lunar, in lei.
 *
 * **Estimare, nu plafon.** Nicaieri nu exista o limita in lei - la pompa se blocheaza litrii - deci
 * cifra se obtine inmultind plafonul cu pretul mediu platit la alimentari si se schimba odata cu
 * pretul carburantului. Se arata langa cifra in litri, niciodata in locul ei si niciodata in bara.
 *
 * `pricePerLiter` si `source` calatoresc cu ea tocmai ca estimarea sa poata fi aratata cu tot cu
 * premisa ei, nu ca o cifra cazuta din cer.
 */
export type LeiEstimate = {
  value?: number;
  pricePerLiter?: number;
  source?: LeiEstimateSource;
};

/**
 * Ce a raspuns portalul la ultima cerere de plafon **inchisa**, daca s-a inchis in ultimele 24 de ore.
 *
 * Perechea lui `pendingLimit*`: acela spune ce se asteapta, asta cum s-a terminat. Fara el un refuz
 * ar fi tacut - cererea dispare din campurile de asteptare exact ca una reusita - iar motivul, care
 * este tocmai lucrul ce cere actiune (placuta dubla in portal, numar de vehicul invechit, valoare
 * neregasita dupa salvare), ar ramane numai in baza.
 */
export type LimitAnswer = {
  period?: LimitPeriod;
  /** Plafonul cerut, in litri. Zero inseamna ca s-a cerut scoaterea plafonului. */
  liters?: number;
  /** Numai `confirmata` sau `respinsa` - starile deschise vin prin `pendingLimitState`. */
  state?: LimitRequestState;
  /** Motivul refuzului, scris de server in romana pentru utilizator. Lipseste pe o confirmare. */
  message?: string;
  /** ISO, cu ora. */
  at?: string;
};

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
  /**
   * Plafonul saptamanal si cel zilnic, tot in litri si tot pe masina. Portalul le tine pe toate
   * trei pe acelasi formular, iar la pompa opreste primul atins.
   *
   * Absente la majoritatea masinilor, si acolo asta chiar inseamna *fara plafon pe perioada aceea*.
   * Bara de progres ramane pe cel lunar: numai pentru el avem si consumul de comparat.
   */
  weeklyLimitLiters?: number;
  dailyLimitLiters?: number;
  /** Cat ar costa plafonul **lunar** in lei. Estimare, nu plafon - vezi `LeiEstimate`. */
  limitEstimateLei?: LeiEstimate;
  /** Consumul lunii curente. Zero este un raspuns adevarat, nu o lipsa de date. */
  usedLiters?: number;
  usedLei?: number;
  /**
   * Cererea de schimbare a unui plafon care inca nu si-a primit raspunsul din portal.
   *
   * Cele trei campuri vin impreuna sau deloc, si numai pentru cererile deschise: una confirmata
   * si-a scris deja valoarea in plafon, iar una respinsa nu mai asteapta nimic. Se afiseaza
   * **langa** plafonul curent - pana cand taskul programat duce cererea in portal pot trece ore,
   * iar la pompa opreste tot valoarea veche.
   */
  pendingLimitLiters?: number;
  pendingLimitPeriod?: LimitPeriod;
  pendingLimitState?: LimitRequestState;
  /** Cum s-a terminat ultima cerere inchisa de curand - vezi `LimitAnswer`. */
  limitAnswer?: LimitAnswer;
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

/**
 * Ce trimite ecranul cand un manager **cere** schimbarea unui plafon.
 *
 * Cere, nu schimba: portalul Rompetrol este sursa de adevar - valoarea lui este cea care opreste
 * pompa - iar plafoanele de pe masina sunt copia lui, scrisa numai din ce se citeste inapoi de pe
 * pagina vehiculului. Apelul creeaza o cerere, pe care un task programat o duce in portal.
 */
export type LimitRequest = {
  carId: string;
  period: LimitPeriod;
  /** **In litri.** Zero inseamna "fara plafon" - o alegere explicita, nu un camp lasat gol. */
  liters: number;
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
  requestLimitChange(input: LimitRequest): Promise<Car>;
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
export async function requestLimitChange(input: LimitRequest) {
  return (await source()).requestLimitChange(input);
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

// ---------------------------------------------------------------- plafoane

export const LIMIT_PERIOD_LABEL: Record<LimitPeriod, string> = {
  lunara: "Plafon lunar",
  saptamanala: "Plafon săptămânal",
  zilnica: "Plafon zilnic",
};

/** Forma scurta, pentru cand eticheta intra intr-o propozitie: "plafonul *lunar* de 1.000 L". */
export const LIMIT_PERIOD_ADJECTIVE: Record<LimitPeriod, string> = {
  lunara: "lunar",
  saptamanala: "săptămânal",
  zilnica: "zilnic",
};

/** Numai starile deschise ajung pe masina; celelalte doua exista ca tipul sa fie complet. */
export const LIMIT_STATE_LABEL: Record<LimitRequestState, string> = {
  ceruta: "În așteptare",
  trimisa: "Trimisă în portal",
  confirmata: "Confirmată",
  respinsa: "Respinsă",
};

/** Cat de aproape de masina este pretul din care iese estimarea - cu cat mai departe, cu atat mai slab. */
export const LEI_ESTIMATE_SOURCE_LABEL: Record<LeiEstimateSource, string> = {
  masina_luna_curenta: "din alimentările mașinii, luna aceasta",
  masina_istoric: "din alimentările mașinii, ultimele luni",
  partener_istoric: "din media flotei — estimare slabă",
};

/**
 * Pana aici, inclusiv, portalul nu tine un plafon, ci **bareaza** vehiculul: din cele 785 de masini
 * cu plafon, 69 stau pe `0.01` sau `1.00` si niciuna nu a mai alimentat. Cine tasteaza "1" crezand
 * ca da un litru ar opri masina fara sa stie. `CereriLimitaMasina.PragBlocare`.
 */
export const BLOCK_THRESHOLD_LITERS = 1;

/**
 * "Fara plafon" - optiunea *Nelimitat* a portalului, codificata tot printr-un numar, ca si bararea
 * prin `0.01`. De aceea zero se accepta desi este sub pragul de blocare: nu este o valoare lipsa,
 * ci o alegere, si ecranul trebuie sa o ofere ca atare.
 */
export const UNLIMITED_LITERS = 0;

/**
 * Plafonul de siguranta impotriva confuziei litri / lei, pe fiecare perioada.
 *
 * Nu este lunarul impartit la 4 sau la 30 - plafoanele scurte limiteaza o alimentare, nu impart
 * luna - ci aproape dublul celui mai mare plafon real de azi (4000 lunar, 2000 saptamanal, 800
 * zilnic), destul cat sa lase loc oricarui vehicul si tot sa prinda o cifra tastata in lei.
 * Aceleasi valori ca in `CereriLimitaMasina.MaxLitriPePerioada`.
 */
export const LIMIT_MAX_LITERS: Record<LimitPeriod, number> = {
  lunara: 10000,
  saptamanala: 4000,
  zilnica: 2000,
};

/** Aceeasi scara ca pe coloana (decimal 19,2), ca valoarea ceruta si cea comparata sa coincida. */
export function roundLiters(liters: number): number {
  return Math.round(liters * 100) / 100;
}

/** Plafonul masinii pe perioada ceruta. `undefined` inseamna *nu stim*, nu "fara plafon". */
export function carLimit(car: Car, period: LimitPeriod): number | undefined {
  if (period === "saptamanala") return car.weeklyLimitLiters;
  if (period === "zilnica") return car.dailyLimitLiters;
  return car.limitLiters;
}

/** O valoare de plafon care bareaza vehiculul in loc sa il limiteze. Zero nu intra: e "Nelimitat". */
export function isBlockingValue(liters?: number): liters is number {
  return liters != null && liters > 0 && liters <= BLOCK_THRESHOLD_LITERS;
}

/**
 * Masina este barata la alimentare - afisata ca **stare**, nu ca procent: o bara pe `0.01` ar da
 * ~98 000%.
 *
 * Se uita la toate trei plafoanele, nu doar la cel lunar: la pompa opreste primul atins, deci o
 * masina cu plafon lunar de 500 L si zilnic de `0.01` este oprita, oricat ar arata bara lunara.
 */
export function isBlocked(car: Car): boolean {
  return LIMIT_PERIODS.some((p) => isBlockingValue(carLimit(car, p)));
}

/** Pragul de la care o masina merita privita: aproape de plafon, dar inca sub el. */
export const NEAR_LIMIT = 0.8;

/**
 * Cat din plafonul lunar s-a consumat, ca raport. `null` cand raportul nu ar insemna nimic: masina
 * nu are plafon lunar, sau este barata la alimentare - o blocare nu este o alocatie din care sa se
 * fi consumat o parte.
 */
export function usageRatio(car: Car): number | null {
  if (car.limitLiters == null || car.limitLiters <= BLOCK_THRESHOLD_LITERS) return null;
  if (isBlocked(car)) return null;
  return (car.usedLiters ?? 0) / car.limitLiters;
}

/**
 * Pretul la litru din care se calculeaza estimarea in lei, si de unde vine.
 *
 * Backendul trimite `limitEstimateLei` **numai** cand masina are deja un plafon lunar, deci exact
 * masina careia i se pune primul plafon ar ramane fara estimare tocmai in formularul unde se
 * tasteaza. Acolo se cade pe pretul mediu al lunii curente a masinii - aceeasi formula si aceeasi
 * sursa ca prima treapta a serverului (`sum(total) / sum(litri)`), nu un pret inventat.
 */
export function limitPricePerLiter(car: Car): { price: number; source?: LeiEstimateSource } | null {
  const price = car.limitEstimateLei?.pricePerLiter;
  if (price != null && price > 0) return { price, source: car.limitEstimateLei?.source };

  const liters = car.usedLiters ?? 0;
  const lei = car.usedLei ?? 0;
  if (liters > 0 && lei > 0) return { price: lei / liters, source: "masina_luna_curenta" };

  // Nici masina, nici serverul nu au din ce scoate un pret: se afiseaza doar litrii. O cifra in lei
  // scoasa dintr-un pret inventat ar fi mai rea decat lipsa ei.
  return null;
}

/**
 * Ce refuza serverul, refuzat si aici, in aceiasi termeni - `CereriLimitaMasina.verifica`.
 *
 * Nu este o dublare de dragul simetriei: un refuz dupa trimitere este o plasa, nu o interfata, iar
 * mesajele astea sunt singurul loc in care utilizatorul afla **de ce** un plafon de un litru nu se
 * poate cere. Cele doua verificari pe care frontendul nu le poate face - masina scoasa din flota si
 * masina fara partener - raman numai pe server: DTO-ul nu poarta niciunul dintre cele doua campuri.
 *
 * Intoarce mesajul de refuz, sau `null` cand valoarea trece.
 */
export function limitError(car: Car, period: LimitPeriod, liters: number | null): string | null {
  const what = LIMIT_PERIOD_ADJECTIVE[period];

  if (liters == null || Number.isNaN(liters)) {
    return `Completează plafonul ${what}, în litri.`;
  }

  const asked = roundLiters(liters);

  if (asked < 0) {
    return `Plafonul ${what} nu poate fi negativ.`;
  }

  const max = LIMIT_MAX_LITERS[period];
  if (asked > max) {
    return (
      `Plafonul se dă în litri, nu în lei, iar ${formatLimitLiters(asked)} depășește maximul` +
      ` admis de ${formatLimitLiters(max)} pentru plafonul ${what}.`
    );
  }

  // Mesajul spune de ce, nu doar ca nu se poate: altfel pragul arata ca un minim arbitrar, pe care
  // urmatorul care il intalneste il ridica. Bararea unei masini se cere separat, nu prin plafon.
  if (isBlockingValue(asked)) {
    return (
      `Un plafon de ${formatLimitLiters(asked)} nu limitează alimentarea, ci o oprește: portalul` +
      ` barează vehiculul la valorile acestea. Plafonul ${what} trebuie să fie peste` +
      ` ${formatLimitLiters(BLOCK_THRESHOLD_LITERS)}, ori exact 0 pentru „fără plafon”.`
    );
  }

  // Necompletat nu se citeste ca zero, desi in portal ar fi "Nelimitat": coloana goala inseamna ca
  // nu stim, deci o cerere de "fara plafon" pe o masina fara plafon cunoscut trebuie sa treaca.
  const current = carLimit(car, period);
  if (current != null && roundLiters(current) === asked) {
    return asked === 0
      ? `${car.plate} este deja fără plafon ${what}.`
      : `${car.plate} are deja plafonul ${what} de ${formatLimitLiters(asked)}.`;
  }

  // Doua cereri pe acelasi plafon ar pleca spre portal in aceeasi incarcare si nu s-ar sti care a
  // castigat. Pe plafoane diferite se poate: sunt campuri diferite pe acelasi formular.
  if (car.pendingLimitLiters != null && car.pendingLimitPeriod === period) {
    return (
      `${car.plate} are deja o cerere în așteptare pentru plafonul ${what}, de` +
      ` ${formatLimitLiters(car.pendingLimitLiters)}.`
    );
  }

  return null;
}

/**
 * Un plafon asa cum se scrie pe ecran, cu unitatea de neratat.
 *
 * Nu foloseste `formatLiters`: acela pune mereu o zecimala, potrivita pentru un consum masurat la
 * pompa, pe cand un plafon este o cifra rotunda tastata de om - "1.000 L", nu "1.000,0 L". Zecimalele
 * apar numai cand exista, ca `0,01 L` sa nu se vada ca `0 L`.
 */
export function formatLimitLiters(liters: number): string {
  return `${liters.toLocaleString("ro-RO", { maximumFractionDigits: 2 })} L`;
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
