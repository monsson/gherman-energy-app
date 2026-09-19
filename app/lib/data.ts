// Datele demo.
//
// Sursa de date a modului demo (fara `VITE_API_BASE_URL`), acolo unde aplicatia trebuie sa mearga
// fara backend - publicarea de pe GitHub Pages. Formele exportate sunt **cele de domeniu** din
// `fleet.ts`, nu unele proprii: asa adaptorul demo din `fleet.demo.ts` doar le inveleste in
// promisiuni, iar ecranele nu afla niciodata din ce mod ruleaza.
//
// Un LCG cu samanta fixa genereaza totul la incarcarea modulului, deci datele sunt stabile intre
// reincarcari - dar **se schimba daca se atinge samanta sau logica de generare**.

import { CAR_DOCUMENT_TYPES, carLimit } from "./fleet";
import type {
  Car,
  CarDocumentType,
  Driver,
  FuelType,
  Invoice,
  InvoiceLine,
  LeiEstimateSource,
  LimitPeriod,
  LimitRequestState,
  Segment,
  Station,
  Transaction,
} from "./fleet";

let _seed = 1337;
function rng() {
  _seed = (_seed * 9301 + 49297) % 233280;
  return _seed / 233280;
}
function randInt(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number, decimals = 2) {
  const v = rng() * (max - min) + min;
  return Math.round(v * 10 ** decimals) / 10 ** decimals;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

const DRIVER_NAMES = [
  "Marian Popescu",
  "Maria Ionescu",
  "Ion Vasile",
  "Cristian Stoica",
  "Elena Marin",
  "Bogdan Dumitru",
  "Ana Radu",
  "Mihai Tudor",
  "Roxana Constantin",
  "Florin Stan",
];

const CAR_MODELS: { brand: string; model: string; segment: Segment; fuel: FuelType }[] = [
  { brand: "Dacia", model: "Logan", segment: "mica", fuel: "benzina" },
  { brand: "Renault", model: "Clio", segment: "mica", fuel: "benzina" },
  { brand: "Volkswagen", model: "Polo", segment: "mica", fuel: "benzina" },
  { brand: "Skoda", model: "Fabia", segment: "mica", fuel: "motorina" },
  { brand: "Hyundai", model: "i20", segment: "mica", fuel: "benzina" },
  { brand: "Dacia", model: "Dokker", segment: "autoutilitara", fuel: "motorina" },
  { brand: "Ford", model: "Transit Connect", segment: "autoutilitara", fuel: "motorina" },
  { brand: "Renault", model: "Kangoo", segment: "autoutilitara", fuel: "motorina" },
  { brand: "Citroën", model: "Berlingo", segment: "autoutilitara", fuel: "motorina" },
  { brand: "Volkswagen", model: "Caddy", segment: "autoutilitara", fuel: "motorina" },
];

const STATION_DATA: { name: string; address: string }[] = [
  { name: "MOL Mamaia", address: "Bulevardul Tomis 310D, 900407 Constanța" },
  { name: "ROMPETROL Tomis Nord", address: "Bulevardul Alexandru Lăpușneanu 194A, 900472 Constanța" },
  { name: "MOL Constanța Sud", address: "Bulevardul Tomis 310D, 900407 Constanța" },
  { name: "ROMPETROL Năvodari", address: "Bulevardul Alexandru Lăpușneanu 194A, 900472 Constanța" },
  { name: "MOL Mangalia", address: "Bulevardul Tomis 310D, 900407 Constanța" },
  { name: "ROMPETROL Eforie", address: "Bulevardul Alexandru Lăpușneanu 194A, 900472 Constanța" },
  { name: "ROMPETROL Medgidia", address: "Bulevardul Alexandru Lăpușneanu 194A, 900472 Constanța" },
  { name: "MOL Cernavodă", address: "Bulevardul Tomis 310D, 900407 Constanța" },
  { name: "ROMPETROL Ovidiu", address: "Bulevardul Alexandru Lăpușneanu 194A, 900472 Constanța" },
  { name: "MOL Lazu", address: "Bulevardul Tomis 310D, 900407 Constanța" },
];

const PLATE_LETTERS = ["AB", "CD", "EF", "GH", "JK", "LM", "NP", "QR", "ST", "VW"];

/**
 * `yyyy-MM-dd` din componentele locale, nu din `toISOString()`: acolo conversia in UTC muta data cu
 * o zi inapoi pentru orice ora locala dinainte de offset (in Romania, tot ce e la miezul noptii).
 */
function isoDate(d: Date) {
  const luna = String(d.getMonth() + 1).padStart(2, "0");
  const zi = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${luna}-${zi}`;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function buildDrivers(): Driver[] {
  return DRIVER_NAMES.map((name, i) => ({
    id: String(i + 1),
    name,
    cardMasked: `•••• ${String(1000 + i * 137 + 23).slice(-4)}`,
    // Prima etapa a integrarii acopera doar FillAndGo, deci demo-ul nu inventeaza un al doilea
    // furnizor pe care API-ul nu l-ar intoarce.
    cardSupplier: "rompetrol",
  }));
}

function buildCars(): Car[] {
  const today = new Date();
  return CAR_MODELS.map((m, i): Car => {
    // Trei masini primesc un document expirat, ca starea rosie sa aiba ce exercita.
    let itpOffset = randInt(60, 540);
    let rcaOffset = randInt(30, 360);
    let rovOffset = randInt(45, 450);
    if (i === 2) itpOffset = -10; // ITP expirat
    if (i === 6) rcaOffset = -25; // RCA expirat
    if (i === 8) rovOffset = -5; // rovinieta expirata

    // Plafoanele imita ce se vede in datele reale: majoritatea au unul rezonabil, una este barata
    // de la alimentare cu o valoare simbolica sub un litru, iar una nu are plafon deloc.
    let limitLiters: number | undefined = randInt(6, 10) * 50;
    if (i === 3) limitLiters = 0.01;
    if (i === 7) limitLiters = undefined;

    // Plafonul saptamanal si cel zilnic exista in portal pe ~100 de vehicule din 1600, deci aici
    // le au doua masini din zece: una numai saptamanal, una amandoua. Pe restul lipsa lor chiar
    // inseamna "fara plafon pe perioada aceea", nu "nu stim".
    const weeklyLimitLiters = i === 1 ? 200 : i === 9 ? 150 : undefined;
    const dailyLimitLiters = i === 9 ? 50 : undefined;

    return {
      id: String(i + 1),
      plate: `CT-${String(randInt(10, 99))}-${PLATE_LETTERS[i]}`,
      brand: m.brand,
      model: m.model,
      year: 2018 + randInt(0, 6),
      segment: m.segment,
      fuel: m.fuel,
      driverId: String(i + 1),
      driverName: DRIVER_NAMES[i],
      itp: isoDate(addDays(today, itpOffset)),
      rca: isoDate(addDays(today, rcaOffset)),
      rovinieta: isoDate(addDays(today, rovOffset)),
      limitLiters,
      weeklyLimitLiters,
      dailyLimitLiters,
      usedLiters: 0, // completat dupa generarea tranzactiilor
      usedLei: 0,
    };
  });
}

function buildStations(): Station[] {
  const today = new Date();
  return STATION_DATA.map(
    (s, i): Station => ({
      id: String(i + 1),
      name: s.name,
      address: s.address,
      petrolPrice: randFloat(8, 9),
      dieselPrice: randFloat(9, 10),
      priceUpdatedAt: isoDate(addDays(today, -randInt(1, 14))),
    }),
  );
}

function buildTransactions(cars: Car[], stations: Station[]): Transaction[] {
  const txs: Transaction[] = [];
  const today = new Date();
  const start = addDays(today, -180); // 6 luni
  const totalDays = 180;

  for (const car of cars) {
    let odometer = randInt(20000, 90000);
    // 1-3 alimentari pe saptamana => aproximativ 25-75 in sase luni.
    const daysBetween = randInt(3, 7);
    let dayCursor = randInt(0, daysBetween);

    while (dayCursor < totalDays) {
      const station = pick(stations);
      const liters = randFloat(40, 60, 1);
      const basePrice = car.fuel === "benzina" ? randFloat(8, 9) : randFloat(9, 10);
      const total = Math.round(liters * basePrice * 100) / 100;
      const kmDriven = randInt(220, 520);
      odometer += kmDriven;
      const date = addDays(start, dayCursor);
      date.setHours(randInt(7, 20), randInt(0, 59), 0, 0);

      txs.push({
        id: `T${car.id}-${dayCursor}`,
        date: date.toISOString(),
        carId: car.id,
        plate: car.plate,
        driverId: car.driverId,
        fuel: car.fuel,
        supplier: "rompetrol",
        liters,
        pricePerLiter: basePrice,
        total,
        stationId: station.id,
        stationName: station.name,
        kmDriven,
        odometer,
      });

      dayCursor += randInt(3, 7);
    }
  }

  txs.sort((a, b) => ((a.date ?? "") < (b.date ?? "") ? 1 : -1));
  return txs;
}

/** Emitentul facturilor demo. In modul API vine din `EmitentFacturi`, prin `FurnizorPwa`. */
export const DEMO_SUPPLIER = {
  name: "Gherman Energy SRL",
  cui: "RO27853425",
  address: "Mircea cel Bătrân nr. 132, Constanța",
};

function buildInvoices(txs: Transaction[]): { invoice: Invoice; lines: InvoiceLine[]; txIds: string[] }[] {
  // Grupare pe luna, ca la facturarea reala: o factura client pe luna.
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    if (!t.date) continue;
    const key = t.date.slice(0, 7);
    const grup = map.get(key);
    if (grup) grup.push(t);
    else map.set(key, [t]);
  }

  const chei = [...map.keys()].sort().reverse().slice(0, 6);
  const today = new Date();

  return chei.map((luna, i) => {
    const items = map.get(luna)!;
    const [an, mn] = luna.split("-").map(Number);
    const totalCuTva = Math.round(items.reduce((s, t) => s + (t.total ?? 0), 0) * 100) / 100;
    const subtotal = Math.round((totalCuTva / 1.19) * 100) / 100;
    const vat = Math.round((totalCuTva - subtotal) * 100) / 100;
    const issue = new Date(an, mn, 1);
    const due = addDays(issue, 30);
    // Cele mai noi doua raman neachitate, ca ecranul sa aiba ambele stari.
    const unpaid = i < 2 || issue > today;

    const litri = (fuel: FuelType) =>
      Math.round(items.filter((t) => t.fuel === fuel).reduce((s, t) => s + (t.liters ?? 0), 0) * 10) / 10;
    const valoare = (fuel: FuelType) =>
      Math.round(items.filter((t) => t.fuel === fuel).reduce((s, t) => s + (t.total ?? 0), 0) * 100) / 100;

    const lines: InvoiceLine[] = (["motorina", "benzina"] as FuelType[])
      .filter((f) => litri(f) > 0)
      .map((f, idx) => {
        const cnt = litri(f);
        const totalWithVat = valoare(f);
        const totalNoVat = Math.round((totalWithVat / 1.19) * 100) / 100;
        return {
          no: idx + 1,
          name: f === "benzina" ? "Benzină" : "Motorină",
          cnt,
          unit: "L",
          priceNoVat: cnt > 0 ? Math.round((totalNoVat / cnt) * 100) / 100 : 0,
          totalNoVat,
          totalWithVat,
        };
      });

    return {
      invoice: {
        id: `R${i + 1}`,
        number: `GPF ${8000 + i}`,
        date: isoDate(issue),
        dueDate: isoDate(due),
        subtotal,
        vat,
        total: totalCuTva,
        balance: unpaid ? totalCuTva : 0,
        status: unpaid ? "unpaid" : "paid",
      },
      lines,
      txIds: items.map((t) => t.id),
    };
  });
}

export const drivers: Driver[] = buildDrivers();
export const cars: Car[] = buildCars();
export const stations: Station[] = buildStations();
export const transactions: Transaction[] = buildTransactions(cars, stations);
export let invoices = buildInvoices(transactions);

/**
 * Consumul lunii curente pe fiecare masina, in litri si in lei - exact cele doua cifre pe care le
 * trimite `MasinaPwa` in modul API. Se recalculeaza dupa fiecare alimentare adaugata.
 */
function recomputeUsed() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  for (const c of cars) {
    c.usedLiters = 0;
    c.usedLei = 0;
  }
  for (const t of transactions) {
    if (!t.date || t.date < monthStart) continue;
    const car = cars.find((c) => c.id === t.carId);
    if (!car) continue;
    car.usedLiters = (car.usedLiters ?? 0) + (t.liters ?? 0);
    car.usedLei = (car.usedLei ?? 0) + (t.total ?? 0);
  }
  for (const c of cars) {
    c.usedLiters = Math.round((c.usedLiters ?? 0) * 10) / 10;
    c.usedLei = Math.round((c.usedLei ?? 0) * 100) / 100;
  }
}
recomputeUsed();

/**
 * Doua masini primesc plafoane croite pe consumul lor real din luna curenta, ca starile "aproape de
 * plafon" si "peste plafon" sa aiba ce exercita.
 *
 * Nu se pot fixa la generare: consumul se aduna abia dupa ce exista alimentarile, iar la inceput de
 * luna toate barele sunt oricum aproape goale - adica exact cele doua culori care conteaza nu s-ar
 * vedea niciodata in demo. Aceeasi intentie ca la documentele expirate si la masina blocata.
 */
function calibreazaPlafoaneDemo() {
  const aproape = cars[4];
  if (aproape?.usedLiters) aproape.limitLiters = Math.round(aproape.usedLiters / 0.88);
  const peste = cars[5];
  if (peste?.usedLiters) peste.limitLiters = Math.round(peste.usedLiters * 0.8);
}
calibreazaPlafoaneDemo();

/**
 * Estimarea in lei a plafonului lunar, cu aceleasi trei trepte ca `MasiniVizibilePwa.estimariLimita`:
 * pretul mediu al masinii din luna curenta, apoi din tot istoricul ei, apoi al intregii flote.
 *
 * Se opreste la prima treapta care da un pret, si **lipseste cu totul** cand masina nu are plafon
 * lunar sau cand nu iese niciun pret - o cifra scoasa dintr-un pret inventat ar fi mai rea decat
 * lipsa ei. `valoare` se calculeaza din pretul deja rotunjit, ca inmultirea sa dea pe ecran exact
 * suma afisata.
 */
function recomputeEstimates() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const flota = transactions.reduce(
    (acc, t) => ({ liters: acc.liters + (t.liters ?? 0), lei: acc.lei + (t.total ?? 0) }),
    { liters: 0, lei: 0 },
  );

  for (const car of cars) {
    car.limitEstimateLei = undefined;
    if (car.limitLiters == null) continue;

    const own = transactions.filter((t) => t.carId === car.id);
    const trepte: { liters: number; lei: number; source: LeiEstimateSource }[] = [
      {
        liters: car.usedLiters ?? 0,
        lei: car.usedLei ?? 0,
        source: "masina_luna_curenta",
      },
      {
        liters: own.reduce((sum, t) => sum + (t.liters ?? 0), 0),
        lei: own.reduce((sum, t) => sum + (t.total ?? 0), 0),
        source: "masina_istoric",
      },
      { liters: flota.liters, lei: flota.lei, source: "partener_istoric" },
    ];

    const treapta = trepte.find((t) => t.liters > 0 && t.lei > 0);
    if (!treapta) continue;

    const pretLitru = Math.round((treapta.lei / treapta.liters) * 100) / 100;
    car.limitEstimateLei = {
      value: Math.round(car.limitLiters * pretLitru * 100) / 100,
      pricePerLiter: pretLitru,
      source: treapta.source,
    };
  }
}

// Si luna curenta, si istoricul depind de tranzactii, deci estimarile se asaza abia acum.
recomputeEstimates();

// ---------------------------------------------------------------------------
// Cererile de schimbare a plafonului
// ---------------------------------------------------------------------------

/**
 * Un rand din `gp_CerereLimitaMasina`.
 *
 * Coada exista si in demo pentru ca ea este toata poanta mecanismului: managerul nu schimba
 * plafonul, ci **cere** schimbarea, iar valoarea de pe masina se scrie abia din ce se citeste
 * inapoi din portal. Un demo care ar aplica pe loc ar ascunde tocmai starea pe care ecranul
 * trebuie sa o arate.
 */
export type LimitRequestRow = {
  id: string;
  carId: string;
  period: LimitPeriod;
  oldValue?: number;
  newValue: number;
  state: LimitRequestState;
  /** Epoch ms - de la el se masoara "cat mai are de asteptat". */
  requestedAt: number;
  /** Epoch ms, la inchidere. Fereastra raspunsului se masoara de aici, ca in backend. */
  closedAt?: number;
  /** Motivul refuzului, ca `CerereLimitaMasina.mesajEroare`. Gol pe o cerere confirmata. */
  message?: string;
};

/**
 * Cat sta o cerere in coada inainte sa fie dusa "in portal".
 *
 * In backend o duce un task programat la fiecare jumatate de ora; aici ar insemna un demo in care
 * nimic nu se intampla cat esti pe pagina. Un sfert de minut este destul cat starea *in asteptare*
 * sa se vada si sa nu para o eroare, si putin destul cat sa poti cere altceva fara sa astepti.
 */
const SETTLE_MS = 15_000;

/**
 * Masinile pe care demo-ul refuza cererile, ca ramura de respingere sa aiba ce exercita.
 *
 * Reproduce cazul real cel mai des intalnit: placuta care apare de doua ori in portal (14 la numar),
 * pe care trimiterea nu poate spune carei inregistrari ii apartine valoarea, deci inchide cererea
 * `respinsa` fara sa scrie nimic. Ca in backend, motivul ramane pe rand si **nu** pleaca spre ecran:
 * `CerereLimitaMasina.mesajEroare` nu este in `MasinaPwa`.
 */
const PLACUTE_AMBIGUE = new Set(["3"]);

/** Cat timp mai pleaca raspunsul unei cereri inchise - `CereriLimitaMasina.OrePastrareRaspuns`. */
const ORE_PASTRARE_RASPUNS = 24;

export const limitRequests: LimitRequestRow[] = [];

/** Cererile inca nedeschise - cele pe care backendul le intoarce in `limitaInAsteptare`. */
export function openLimitRequests(): LimitRequestRow[] {
  return limitRequests.filter((r) => r.state === "ceruta" || r.state === "trimisa");
}

export function openLimitRequest(carId: string, period: LimitPeriod): LimitRequestRow | undefined {
  // Ordonate crescator dupa cerere, ca in backend: ultima pusa este cea mai recenta.
  return openLimitRequests()
    .filter((r) => r.carId === carId && r.period === period)
    .pop();
}

export function addLimitRequest(car: Car, period: LimitPeriod, liters: number): LimitRequestRow {
  const row: LimitRequestRow = {
    id: `L${car.id}-${period}-${Date.now()}`,
    carId: car.id,
    period,
    oldValue: carLimit(car, period),
    newValue: liters,
    state: "ceruta",
    requestedAt: Date.now(),
  };
  limitRequests.push(row);
  return row;
}

/**
 * Ce face taskul programat: duce cererile coapte in portal si le inchide pe loc cu ce arata pagina
 * dupa salvare - deci plafonul masinii se scrie **de aici**, din raspunsul portalului, nu din ce a
 * tastat managerul.
 *
 * Merge lenes, la fiecare citire, nu pe un cronometru: un `setTimeout` la nivel de modul ar tine
 * fila treaza si ar trebui oprit la descarcare, pentru exact acelasi rezultat.
 */
function settleLimitRequests() {
  const scadente = openLimitRequests().filter((r) => Date.now() - r.requestedAt >= SETTLE_MS);
  if (scadente.length === 0) return;

  for (const row of scadente) {
    // Refuzul nu scrie nimic: plafonul ramane cel vechi, exact ce vede si ecranul, care deduce
    // raspunsul comparand valoarea ceruta cu cea de acum.
    row.closedAt = Date.now();

    if (PLACUTE_AMBIGUE.has(row.carId)) {
      row.state = "respinsa";
      // Acelasi text pe care il compune trimiterea din backend, ca ecranul sa arate la fel.
      row.message =
        "Placuta apare de doua ori in portal, pe doua inregistrari active, deci nu se stie" +
        " careia ii apartine plafonul. Completati numarul de vehicul pe masina, din back-office.";
      continue;
    }

    const car = cars.find((c) => c.id === row.carId);
    row.state = "confirmata";
    if (!car) continue;
    if (row.period === "saptamanala") car.weeklyLimitLiters = row.newValue;
    else if (row.period === "zilnica") car.dailyLimitLiters = row.newValue;
    else car.limitLiters = row.newValue;
  }
  // Plafonul lunar s-a schimbat, deci si cat ar costa el.
  recomputeEstimates();
  persist();
}

/** Cererea deschisa a fiecarei masini, asezata pe `Car` exact cum o pune serverul in `MasinaPwa`. */
function recomputePendingLimits() {
  settleLimitRequests();

  const deschise = new Map<string, LimitRequestRow>();
  // Cand o masina are cereri deschise pe mai multe plafoane, campurile o poarta pe cea mai recenta.
  for (const row of openLimitRequests()) deschise.set(row.carId, row);

  // Ultima cerere inchisa de curand, pe fiecare masina - `CereriLimitaMasina.inchiseRecent`.
  const deCand = Date.now() - ORE_PASTRARE_RASPUNS * 3600_000;
  const inchise = new Map<string, LimitRequestRow>();
  for (const row of limitRequests) {
    if (row.closedAt == null || row.closedAt < deCand) continue;
    const anterior = inchise.get(row.carId);
    if (!anterior || row.closedAt >= (anterior.closedAt ?? 0)) inchise.set(row.carId, row);
  }

  for (const car of cars) {
    const row = deschise.get(car.id);
    car.pendingLimitLiters = row?.newValue;
    car.pendingLimitPeriod = row?.period;
    car.pendingLimitState = row?.state;

    const raspuns = inchise.get(car.id);
    car.limitAnswer = raspuns && {
      period: raspuns.period,
      liters: raspuns.newValue,
      state: raspuns.state,
      message: raspuns.message,
      at: new Date(raspuns.closedAt!).toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Documentele masinilor
// ---------------------------------------------------------------------------

/**
 * Un rand din `gp_DocumentMasina`, cu masina cu tot.
 *
 * `current` lipseste: in backend nu este o coloana, ci rezultatul ordonarii - documentul curent al
 * unui tip este cel cu `max(dataExpirare)`. Il calculeaza adaptorul demo, la fel ca serverul, ca
 * incarcarea unui scan nou sa nu aiba de intretinut un steag.
 */
export type CarDocumentRow = {
  id: string;
  carId: string;
  type: CarDocumentType;
  issued?: string;
  /** `yyyy-MM-dd`. Randurile fara termen nu ajung in API, deci nici aici. */
  expires: string;
  hasScan: boolean;
  fileName?: string;
  sizeBytes?: number;
  /**
   * Continutul unui scan incarcat din interfata, ca descarcarea sa intoarca exact ce s-a trimis.
   * **Nu se salveaza in localStorage**: un PDF de cateva MB ar depasi cota si ar pierde tot storul.
   * Dupa un refresh randul ramane, iar descarcarea cade pe documentul fictiv generat de `pdf.ts`.
   */
  contentBase64?: string;
};

/**
 * Cate un document curent pentru fiecare termen al fiecarei masini, plus cateva cazuri anume, ca
 * ecranul sa aiba ce exercita: doua termene **fara scan** - cazul obisnuit pe datele reale, unde
 * data se trece in back-office inainte sa existe documentul scanat - si doua reinnoiri, adica
 * randuri de istoric, pe care butonul de descarcare nu trebuie sa apara.
 *
 * Fara `rng()`: generarea documentelor a venit dupa restul datelor, iar consumate aici numerele ar
 * fi mutat toate alimentarile deja generate.
 */
const FARA_SCAN = new Set(["3:itp", "6:rovinieta"]);
const CU_ISTORIC = new Set(["1:itp", "5:rca"]);
/** O masina fara niciun document de un tip - starea "Necunoscut", alta decat "fara scan". */
const FARA_DOCUMENT = new Set(["8:rovinieta"]);

function buildCarDocuments(list: Car[]): CarDocumentRow[] {
  const rows: CarDocumentRow[] = [];

  for (const car of list) {
    for (const type of CAR_DOCUMENT_TYPES) {
      const expires = car[type];
      if (!expires) continue;

      const key = `${car.id}:${type}`;
      if (FARA_DOCUMENT.has(key)) continue;

      rows.push(documentRow(car, type, expires, !FARA_SCAN.has(key)));

      if (CU_ISTORIC.has(key)) {
        // Reinnoirea de anul trecut: are scan, dar nu este documentul curent, deci nu se descarca.
        const previous = isoDate(addDays(new Date(expires), -365));
        rows.push(documentRow(car, type, previous, true));
      }
    }
  }

  return rows;
}

function documentRow(
  car: Car,
  type: CarDocumentType,
  expires: string,
  hasScan: boolean,
): CarDocumentRow {
  return {
    id: `D${car.id}-${type}-${expires}`,
    carId: car.id,
    type,
    // Documentele se emit cu un an inainte de termen; unul fara scan nu are nici data de emitere,
    // fiindca in back-office se trece doar termenul.
    issued: hasScan ? isoDate(addDays(new Date(expires), -365)) : undefined,
    expires,
    hasScan,
    fileName: hasScan ? scanName(car, type, expires) : undefined,
    // Cat ar ocupa un scan; numarul nu are de ce sa fie real, doar stabil si plauzibil.
    sizeBytes: hasScan ? 180_000 + Number(car.id) * 7_351 : undefined,
  };
}

/** Acelasi nume compus sub care salveaza backendul: "ITP CT56RCH 2027-03-01.pdf". */
export function scanName(car: Car, type: CarDocumentType, expires: string, extension = "pdf") {
  return `${type.toUpperCase()} ${car.plate.replace(/[^A-Z0-9]/gi, "")} ${expires}.${extension}`;
}

export const carDocuments: CarDocumentRow[] = buildCarDocuments(cars);

/**
 * Termenele masinii sunt `max(expires)` pe (masina, tip) - aceeasi regula ca
 * `ExpirariDocumenteMasina` in backend, unde `itp`/`rca`/`rovinieta` nu mai sunt coloane pe masina.
 * Se recalculeaza dupa fiecare scan incarcat.
 */
function recomputeDocumentDates() {
  for (const car of cars) {
    for (const type of CAR_DOCUMENT_TYPES) {
      const latest = carDocuments
        .filter((d) => d.carId === car.id && d.type === type)
        .reduce<string | undefined>((max, d) => (!max || d.expires > max ? d.expires : max), undefined);
      car[type] = latest;
    }
  }
}

// Termenele masinii sunt de acum derivate, ca in modul API: masina fara document de un tip ramane
// fara termen, oricat ar fi generat `buildCars`.
recomputeDocumentDates();

/**
 * Salveaza un scan, cu regula backendului: randul se cauta dupa (masina, tip, termen), deci acelasi
 * termen inseamna acelasi document si scanul il inlocuieste pe cel vechi, iar un termen diferit
 * creeaza randul unei reinnoiri.
 */
export function upsertCarDocument(row: Omit<CarDocumentRow, "id">): CarDocumentRow {
  const existing = carDocuments.find(
    (d) => d.carId === row.carId && d.type === row.type && d.expires === row.expires,
  );

  if (existing) {
    Object.assign(existing, row);
    return existing;
  }

  const created = { ...row, id: `D${row.carId}-${row.type}-${row.expires}` };
  carDocuments.push(created);
  return created;
}

// ---------------------------------------------------------------------------
// Store mutabil, in localStorage: masinile si alimentarile adaugate din interfata se aseaza peste
// datele generate. Exista doar in modul demo - in modul API scrie backendul.
// ---------------------------------------------------------------------------

// v2: `rovigneta` s-a redenumit `rovinieta` si id-urile au trecut de la numar la text.
// v3: termenele masinii nu mai sunt date proprii, ci se deduc din documente - o masina salvata sub
// v2 ar reveni cu date pe care niciun document nu le sustine.
// v4: masinile poarta plafonul saptamanal, pe cel zilnic si estimarea in lei, iar coada de cereri
// de plafon se salveaza si ea - o cerere in asteptare trebuie sa supravietuiasca unui refresh.
const STORE_KEY = "ge.data.v4";

export function persist() {
  if (typeof window === "undefined") return;
  try {
    // Continutul scanurilor nu pleaca in store: cateva MB de base64 ar depasi cota si ar pierde tot.
    const documents = carDocuments.map(({ contentBase64, ...row }) => row);
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ cars, transactions, documents, limits: limitRequests }),
    );
  } catch {
    // Cota depasita sau serializare esuata - in prototip se ignora.
  }
}

function hydrate() {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw) as {
      cars?: Car[];
      transactions?: Transaction[];
      documents?: CarDocumentRow[];
      limits?: LimitRequestRow[];
    };
    if (Array.isArray(data.cars)) cars.splice(0, cars.length, ...data.cars);
    if (Array.isArray(data.transactions))
      transactions.splice(0, transactions.length, ...data.transactions);
    if (Array.isArray(data.documents))
      carDocuments.splice(0, carDocuments.length, ...data.documents);
    if (Array.isArray(data.limits))
      limitRequests.splice(0, limitRequests.length, ...data.limits);
    invoices = buildInvoices(transactions);
    recomputeUsed();
    // Termenele vin din documente, nu din masinile salvate - la fel ca in modul API.
    recomputeDocumentDates();
    recomputeEstimates();
    // O cerere coapta cat fila era inchisa se inchide acum, la prima citire.
    recomputePendingLimits();
  } catch {
    // Store corupt - se ramane pe datele generate.
  }
}
hydrate();

export function nextCarId() {
  return String(cars.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0) + 1);
}

export function refreshDerived() {
  recomputeUsed();
  recomputeDocumentDates();
  recomputeEstimates();
  recomputePendingLimits();
  persist();
}

/**
 * Ce se reaseaza inaintea unei **citiri**, nu a unei scrieri: coada de cereri se coace cu trecerea
 * timpului, nu la o actiune a utilizatorului, deci starea corecta a plafoanelor se afla abia cand
 * un ecran le cere.
 */
export function refreshLimits() {
  recomputePendingLimits();
}

export type TransactionInput = {
  carId: string;
  stationId: string;
  fuel: FuelType;
  liters: number;
  pricePerLiter: number;
  kmDriven: number;
  /** ISO; implicit acum. */
  date?: string;
};

/**
 * Adauga o alimentare. **Numai in modul demo** - prin planul de API adaugarea din frontend este
 * anulata, alimentarile intra exclusiv prin importul din portal. Dispare odata cu modul demo.
 */
export function addTransaction(input: TransactionInput): Transaction {
  const date = input.date ?? new Date().toISOString();
  const car = cars.find((c) => c.id === input.carId);
  const station = stations.find((s) => s.id === input.stationId);
  const total = Math.round(input.liters * input.pricePerLiter * 100) / 100;
  // Kilometrajul continua de la ultima alimentare a masinii.
  const prev = transactions
    .filter((t) => t.carId === input.carId)
    .sort((a, b) => ((a.date ?? "") < (b.date ?? "") ? 1 : -1))[0];

  const tx: Transaction = {
    id: `T${input.carId}-${date}-${transactions.length}`,
    date,
    carId: input.carId,
    plate: car?.plate,
    driverId: car?.driverId,
    fuel: input.fuel,
    supplier: "rompetrol",
    liters: input.liters,
    pricePerLiter: input.pricePerLiter,
    total,
    stationId: input.stationId,
    stationName: station?.name,
    kmDriven: input.kmDriven,
    odometer: (prev?.odometer ?? 0) + input.kmDriven,
  };
  transactions.push(tx);
  transactions.sort((a, b) => ((a.date ?? "") < (b.date ?? "") ? 1 : -1));
  refreshDerived();
  return tx;
}
