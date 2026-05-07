// Seeded LCG so mock data stays stable across renders/reloads in the prototype.
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

export type FuelType = "Benzină" | "Motorină";

export type Driver = {
  id: number;
  name: string;
  cardNumber: string; // 4 digits
  limit: number;
  used: number;
};

export type Car = {
  id: number;
  plate: string;
  brand: string;
  model: string;
  year: number;
  segment: "small" | "utility";
  fuel: FuelType;
  driverId: number;
  itp: string; // ISO date
  rca: string;
  rovigneta: string;
};

export type Station = {
  id: number;
  name: string;
  address: string;
  petrolPrice: number;
  dieselPrice: number;
};

export type Transaction = {
  id: string;
  date: string; // ISO
  carId: number;
  driverId: number;
  stationId: number;
  fuel: FuelType;
  liters: number;
  pricePerLiter: number;
  total: number;
  kmDriven: number; // km since previous fill-up
  odometer: number;
};

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

const CAR_MODELS: { brand: string; model: string; segment: "small" | "utility"; fuel: FuelType }[] = [
  { brand: "Dacia", model: "Logan", segment: "small", fuel: "Benzină" },
  { brand: "Renault", model: "Clio", segment: "small", fuel: "Benzină" },
  { brand: "Volkswagen", model: "Polo", segment: "small", fuel: "Benzină" },
  { brand: "Skoda", model: "Fabia", segment: "small", fuel: "Motorină" },
  { brand: "Hyundai", model: "i20", segment: "small", fuel: "Benzină" },
  { brand: "Dacia", model: "Dokker", segment: "utility", fuel: "Motorină" },
  { brand: "Ford", model: "Transit Connect", segment: "utility", fuel: "Motorină" },
  { brand: "Renault", model: "Kangoo", segment: "utility", fuel: "Motorină" },
  { brand: "Citroën", model: "Berlingo", segment: "utility", fuel: "Motorină" },
  { brand: "Volkswagen", model: "Caddy", segment: "utility", fuel: "Motorină" },
];

const STATION_DATA: { name: string; address: string }[] = [
  { name: "GE Mamaia", address: "Bd. Mamaia 220, Constanța" },
  { name: "GE Tomis Nord", address: "Str. Soveja 88, Constanța" },
  { name: "GE Constanța Sud", address: "Șos. Mangaliei 145, Constanța" },
  { name: "GE Năvodari", address: "Bd. Mamaia-Sat 12, Năvodari" },
  { name: "GE Mangalia", address: "Șos. Constanței 30, Mangalia" },
  { name: "GE Eforie", address: "Bd. Republicii 2, Eforie Nord" },
  { name: "GE Medgidia", address: "Str. Independenței 41, Medgidia" },
  { name: "GE Cernavodă", address: "Str. Portului 7, Cernavodă" },
  { name: "GE Ovidiu", address: "DN2A km 6, Ovidiu" },
  { name: "GE Lazu", address: "DN39 km 10, Lazu" },
];

const PLATE_LETTERS = ["AB", "CD", "EF", "GH", "JK", "LM", "NP", "QR", "ST", "VW"];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function buildDrivers(): Driver[] {
  return DRIVER_NAMES.map((name, i) => ({
    id: i + 1,
    name,
    cardNumber: String(1000 + i * 137 + 23).slice(-4).padStart(4, "0"),
    limit: 1500,
    used: 0, // filled in after transactions are generated
  }));
}

function buildCars(): Car[] {
  const today = new Date();
  return CAR_MODELS.map((m, i) => {
    // Two cars get an expired document so the red-state can be exercised.
    let itpOffset = randInt(60, 540);
    let rcaOffset = randInt(30, 360);
    let rovOffset = randInt(45, 450);
    if (i === 2) itpOffset = -10; // expired ITP
    if (i === 6) rcaOffset = -25; // expired RCA
    if (i === 8) rovOffset = -5; // expired rovignetă

    return {
      id: i + 1,
      plate: `CT-${String(randInt(10, 99))}-${PLATE_LETTERS[i]}`,
      brand: m.brand,
      model: m.model,
      year: 2018 + randInt(0, 6),
      segment: m.segment,
      fuel: m.fuel,
      driverId: i + 1,
      itp: isoDate(addDays(today, itpOffset)),
      rca: isoDate(addDays(today, rcaOffset)),
      rovigneta: isoDate(addDays(today, rovOffset)),
    };
  });
}

function buildStations(): Station[] {
  return STATION_DATA.map((s, i) => ({
    id: i + 1,
    name: s.name,
    address: s.address,
    petrolPrice: randFloat(8, 9),
    dieselPrice: randFloat(9, 10),
  }));
}

function buildTransactions(cars: Car[], stations: Station[]): Transaction[] {
  const txs: Transaction[] = [];
  const today = new Date();
  const start = addDays(today, -180); // 6 months
  const totalDays = 180;

  for (const car of cars) {
    let odometer = randInt(20000, 90000);
    // 1-3 fill-ups per week per car → roughly 25-75 over 6 months.
    const daysBetween = randInt(3, 7);
    let dayCursor = randInt(0, daysBetween);

    while (dayCursor < totalDays) {
      const station = pick(stations);
      const liters = randFloat(40, 60, 1);
      const basePrice = car.fuel === "Benzină" ? randFloat(8, 9) : randFloat(9, 10);
      const total = Math.round(liters * basePrice * 100) / 100;
      const kmDriven = randInt(220, 520);
      odometer += kmDriven;
      const date = addDays(start, dayCursor);
      // Spread fill-ups across the day a little.
      date.setHours(randInt(7, 20), randInt(0, 59), 0, 0);

      txs.push({
        id: `T${car.id}-${dayCursor}`,
        date: date.toISOString(),
        carId: car.id,
        driverId: car.driverId,
        stationId: station.id,
        fuel: car.fuel,
        liters,
        pricePerLiter: basePrice,
        total,
        kmDriven,
        odometer,
      });

      dayCursor += randInt(3, 7);
    }
  }

  txs.sort((a, b) => (a.date < b.date ? 1 : -1));
  return txs;
}

export const drivers: Driver[] = buildDrivers();
export const cars: Car[] = buildCars();
export const stations: Station[] = buildStations();
export const transactions: Transaction[] = buildTransactions(cars, stations);

// Compute "used" for each driver from this month's transactions.
{
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  for (const t of transactions) {
    if (t.date >= monthStart) {
      const d = drivers.find((x) => x.id === t.driverId);
      if (d) d.used += t.total;
    }
  }
  for (const d of drivers) d.used = Math.round(d.used * 100) / 100;
}

export function getCar(id: number) {
  return cars.find((c) => c.id === id);
}
export function getDriver(id: number) {
  return drivers.find((d) => d.id === id);
}
export function getStation(id: number) {
  return stations.find((s) => s.id === id);
}

export function isExpired(dateStr: string) {
  return new Date(dateStr).getTime() < Date.now();
}

export function carHasExpiredDoc(car: Car) {
  return isExpired(car.itp) || isExpired(car.rca) || isExpired(car.rovigneta);
}

export function transactionsForCar(carId: number) {
  return transactions.filter((t) => t.carId === carId);
}
export function transactionsForStation(stationId: number) {
  return transactions.filter((t) => t.stationId === stationId);
}
export function transactionsForDriver(driverId: number) {
  return transactions.filter((t) => t.driverId === driverId);
}

// Monthly aggregation for charts. Returns the last 6 months (oldest → newest).
export function monthlyAggregate(txs: Transaction[]) {
  const buckets: Record<string, { liters: number; km: number; total: number }> = {};
  for (const t of txs) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = (buckets[key] ??= { liters: 0, km: 0, total: 0 });
    b.liters += t.liters;
    b.km += t.kmDriven;
    b.total += t.total;
  }

  const out: { month: string; label: string; liters: number; km: number; consumption: number; total: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets[key] ?? { liters: 0, km: 0, total: 0 };
    out.push({
      month: key,
      label: d.toLocaleDateString("ro-RO", { month: "short" }),
      liters: Math.round(b.liters * 10) / 10,
      km: Math.round(b.km),
      consumption: b.km > 0 ? Math.round((b.liters / b.km) * 1000) / 10 : 0, // L/100km
      total: Math.round(b.total * 100) / 100,
    });
  }
  return out;
}

// Top 3 stations by lowest combined fuel price.
export function topCheapStations(): Station[] {
  return [...stations]
    .sort((a, b) => a.petrolPrice + a.dieselPrice - (b.petrolPrice + b.dieselPrice))
    .slice(0, 3);
}

export type Promotion = { id: number; title: string; detail: string; stationName: string };
export const promotions: Promotion[] = [
  {
    id: 1,
    title: "Cornuleț 7Days gratis",
    detail: "La orice alimentare cu cardul GE",
    stationName: "GE Mamaia",
  },
  {
    id: 2,
    title: "Lichid de parbriz 15 lei",
    detail: "Preț special, redus de la 20 lei",
    stationName: "GE Tomis Nord",
  },
  {
    id: 3,
    title: "Cafea + Apă plată 10 lei",
    detail: "Pauză rapidă pentru șoferi GE",
    stationName: "GE Năvodari",
  },
];
