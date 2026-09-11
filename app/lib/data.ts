// Datele demo.
//
// Sursa de date a modului demo (fara `VITE_API_BASE_URL`), acolo unde aplicatia trebuie sa mearga
// fara backend - publicarea de pe GitHub Pages. Formele exportate sunt **cele de domeniu** din
// `fleet.ts`, nu unele proprii: asa adaptorul demo din `fleet.demo.ts` doar le inveleste in
// promisiuni, iar ecranele nu afla niciodata din ce mod ruleaza.
//
// Un LCG cu samanta fixa genereaza totul la incarcarea modulului, deci datele sunt stabile intre
// reincarcari - dar **se schimba daca se atinge samanta sau logica de generare**.

import type {
  Car,
  Driver,
  FuelType,
  Invoice,
  InvoiceLine,
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
  name: "Gherman Properties SRL",
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

// ---------------------------------------------------------------------------
// Store mutabil, in localStorage: masinile si alimentarile adaugate din interfata se aseaza peste
// datele generate. Exista doar in modul demo - in modul API scrie backendul.
// ---------------------------------------------------------------------------

// v2: `rovigneta` s-a redenumit `rovinieta` si id-urile au trecut de la numar la text; datele
// salvate sub v1 nu se mai potrivesc pe forma noua.
const STORE_KEY = "ge.data.v2";

export function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ cars, transactions }));
  } catch {
    // Cota depasita sau serializare esuata - in prototip se ignora.
  }
}

function hydrate() {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw) as { cars?: Car[]; transactions?: Transaction[] };
    if (Array.isArray(data.cars)) cars.splice(0, cars.length, ...data.cars);
    if (Array.isArray(data.transactions))
      transactions.splice(0, transactions.length, ...data.transactions);
    invoices = buildInvoices(transactions);
    recomputeUsed();
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
  persist();
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
