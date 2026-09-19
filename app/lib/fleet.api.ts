// Adaptorul de API: DTO-urile din `api.ts` traduse in formele de domeniu din `fleet.ts`.
//
// Aici si numai aici se stie ca backendul scrie romaneste, ca datele calatoresc ca text si ca
// `status` vine "platita" / "neplatita". Ecranele primesc forma de domeniu.

import * as api from "./api";
import { downloadBase64 } from "./download";
import type {
  Car,
  CarDetail,
  CarDocument,
  CarDocumentType,
  CarDocumentUpload,
  CarInput,
  Driver,
  FleetSource,
  FuelType,
  Invoice,
  InvoiceDetail,
  InvoiceLine,
  LeiEstimate,
  LeiEstimateSource,
  LimitAnswer,
  LimitPeriod,
  LimitRequest,
  LimitRequestState,
  MonthSummary,
  Segment,
  Station,
  Transaction,
  TransactionFilter,
} from "./fleet";
import { toFuelSupplier } from "./fleet";

function fuel(id?: string): FuelType | undefined {
  return id === "benzina" || id === "motorina" || id === "gpl" ? id : undefined;
}

function segment(id?: string): Segment | undefined {
  return id === "mica" || id === "autoutilitara" ? id : undefined;
}

function documentType(id?: string): CarDocumentType | undefined {
  return id === "itp" || id === "rca" || id === "rovinieta" ? id : undefined;
}

function limitPeriod(id?: string): LimitPeriod | undefined {
  return id === "lunara" || id === "saptamanala" || id === "zilnica" ? id : undefined;
}

function limitState(id?: string): LimitRequestState | undefined {
  return id === "ceruta" || id === "trimisa" || id === "confirmata" || id === "respinsa"
    ? id
    : undefined;
}

function estimateSource(id?: string): LeiEstimateSource | undefined {
  return id === "masina_luna_curenta" || id === "masina_istoric" || id === "partener_istoric"
    ? id
    : undefined;
}

/** Lipseste cand masina nu a avut nicio cerere inchisa in fereastra serverului - cazul obisnuit. */
function limitAnswer(dto?: api.RaspunsLimitaPwa): LimitAnswer | undefined {
  if (!dto) return undefined;
  return {
    period: limitPeriod(dto.perioada),
    liters: dto.valoare,
    state: limitState(dto.stare),
    message: dto.mesaj,
    at: dto.data,
  };
}

/** Lipseste cu totul cand masina nu are plafon lunar sau cand nu iese niciun pret din alimentari. */
function leiEstimate(dto?: api.EstimareLeiPwa): LeiEstimate | undefined {
  if (!dto) return undefined;
  return { value: dto.valoare, pricePerLiter: dto.pretLitru, source: estimateSource(dto.sursa) };
}

function car(dto: api.MasinaPwa): Car {
  return {
    id: dto.id,
    // Numarul de inmatriculare este singurul camp mereu completat in datele reale; fara el randul
    // nu are cum sa fie identificat pe ecran.
    plate: dto.nrInmatriculare ?? "—",
    brand: dto.marca,
    model: dto.model,
    year: dto.anFabricatie,
    segment: segment(dto.segment),
    fuel: fuel(dto.tipCarburant),
    driverId: dto.soferId,
    driverName: dto.soferNume,
    itp: dto.itp,
    rca: dto.rca,
    rovinieta: dto.rovinieta,
    limitLiters: dto.limitaLunara,
    weeklyLimitLiters: dto.limitaSaptamanala,
    dailyLimitLiters: dto.limitaZilnica,
    limitEstimateLei: leiEstimate(dto.estimareLimitaLei),
    usedLiters: dto.consumatLunaCurentaLitri,
    usedLei: dto.consumatLunaCurentaLei,
    pendingLimitLiters: dto.limitaInAsteptare,
    pendingLimitPeriod: limitPeriod(dto.perioadaLimitaInAsteptare),
    pendingLimitState: limitState(dto.stareLimita),
    limitAnswer: limitAnswer(dto.raspunsLimita),
  };
}

function transaction(dto: api.TranzactiePwa): Transaction {
  return {
    id: dto.id,
    date: dto.data,
    carId: dto.masinaId,
    plate: dto.nrInmatriculare,
    fuel: fuel(dto.tipCombustibil),
    supplier: toFuelSupplier(dto.furnizor),
    liters: dto.cantitate,
    pricePerLiter: dto.pretLitru,
    total: dto.totalValoare,
    stationId: dto.statieId,
    stationName: dto.numeStatie,
    odometer: dto.kilometri,
    kmDriven: dto.kmParcursi,
    invoiceRef: dto.nrFactura,
  };
}

function station(dto: api.StatiePwa): Station {
  return {
    id: dto.id,
    name: dto.nume ?? "—",
    address: dto.adresa,
    petrolPrice: dto.pretBenzinaCuTva,
    dieselPrice: dto.pretMotorinaCuTva,
    priceUpdatedAt: dto.dataActualizarePret,
  };
}

function invoice(dto: api.FacturaPwa): Invoice {
  return {
    id: dto.id,
    number: dto.numar ?? "—",
    date: dto.data,
    dueDate: dto.scadenta,
    subtotal: dto.totalFaraTva,
    vat: dto.tva,
    total: dto.totalCuTva,
    balance: dto.sold,
    status: dto.status === "neplatita" ? "unpaid" : "paid",
  };
}

function invoiceLine(dto: api.FacturaLiniePwa): InvoiceLine {
  return {
    no: dto.nrLinie,
    name: dto.denumire,
    cnt: dto.cnt,
    unit: dto.um,
    priceNoVat: dto.pretFaraTva,
    totalNoVat: dto.totalFaraTva,
    totalWithVat: dto.totalCuTva,
  };
}

function summary(dto: api.SumarLunaPwa): MonthSummary {
  return {
    month: dto.luna,
    liters: dto.litri ?? 0,
    km: dto.km ?? 0,
    // Absent inseamna "luna fara distanta", nu "consum zero" - graficul lasa gol, nu deseneaza 0.
    consumption: dto.consumMediu ?? null,
    total: dto.total ?? 0,
  };
}

function carForm(input: CarInput): api.MasinaFormPwa {
  return {
    id: input.id,
    nrInmatriculare: input.plate,
    marca: input.brand,
    model: input.model,
    anFabricatie: input.year,
    segment: input.segment,
    tipCarburant: input.fuel,
    soferId: input.driverId,
  };
}

export const apiSource: FleetSource = {
  async listCars() {
    return (await api.getMasini()).map(car);
  },

  async getCar(id: string): Promise<CarDetail> {
    const dto = await api.getMasina(id);
    return { ...car(dto.masina), driverCardMasked: dto.soferCardMascat };
  },

  async listDrivers(): Promise<Driver[]> {
    return (await api.getSoferi()).map((d) => ({
      id: d.id,
      name: d.nume ?? "—",
      cardMasked: d.cardMascat,
    }));
  },

  async saveCar(input: CarInput) {
    return car(await api.salveazaMasina(carForm(input)));
  },

  async listCarDocuments(carId: string): Promise<CarDocument[]> {
    const list = await api.getDocumenteMasina(carId);
    // Ordinea vine de la server - pe tip, iar in tip de la termenul cel mai indepartat spre cel mai
    // vechi - si ecranul se bazeaza pe ea, deci nu se reordoneaza aici.
    return list.flatMap((dto) => {
      const type = documentType(dto.tip);
      // Un tip pe care frontendul nu il cunoaste nu are rand pe un ecran randat pe tipuri.
      if (!type) return [];
      return [
        {
          id: dto.id,
          type,
          issued: dto.dataEmitere,
          expires: dto.dataExpirare,
          current: dto.curent,
          hasScan: dto.areScan,
          fileName: dto.numeFisier,
          sizeBytes: dto.dimensiuneOcteti,
        },
      ];
    });
  },

  async downloadCarDocument(carId: string, type: CarDocumentType) {
    const fisier = await api.getDocumentMasina(carId, type);
    // Serverul salveaza scanul sub un nume compus ("ITP B150RCH 2027-09-15.pdf"); numele local este
    // doar plasa de siguranta, extensia lui dand si tipul MIME.
    downloadBase64(fisier.numeFisier ?? `${type}.pdf`, fisier.contentBase64);
  },

  async uploadCarDocument(input: CarDocumentUpload) {
    return car(
      await api.incarcaDocumentMasina({
        idMasina: input.carId,
        tip: input.type,
        dataEmitere: input.issued,
        dataExpirare: input.expires,
        numeFisier: input.fileName,
        continutBase64: input.contentBase64,
      }),
    );
  },

  /**
   * Cere schimbarea unui plafon. Plafonul masinii ramane neatins: se schimba doar cererea deschisa,
   * pe care DTO-ul intors o poarta in `pendingLimit*`.
   */
  async requestLimitChange(input: LimitRequest) {
    return car(
      await api.cereSchimbareLimita({
        idMasina: input.carId,
        perioada: input.period,
        limitaLunara: input.liters,
      }),
    );
  },

  async listTransactions(filter: TransactionFilter) {
    const dto = await api.getTranzactii({
      idMasina: filter.carId,
      idStatie: filter.stationId,
      idSofer: filter.driverId,
      dataInceput: filter.from,
      dataSfarsit: filter.to,
      limita: filter.limit,
    });
    return dto.map(transaction);
  },

  async monthlySummary(carId?: string, months?: number) {
    return (await api.getSumarLunar(carId, months)).map(summary);
  },

  async listStations() {
    return (await api.getStatii()).map(station);
  },

  async getStation(id: string) {
    return station(await api.getStatie(id));
  },

  async cheapStations(fuelType?: "benzina" | "motorina", limit?: number) {
    return (await api.getStatiiIeftine(fuelType, limit)).map(station);
  },

  async listInvoices(from?: string, to?: string) {
    return (await api.getFacturi(from, to)).map(invoice);
  },

  async getInvoice(id: string): Promise<InvoiceDetail> {
    const dto = await api.getFactura(id);
    return {
      invoice: invoice(dto.factura),
      supplier: dto.furnizor && {
        name: dto.furnizor.nume,
        cui: dto.furnizor.cui,
        address: dto.furnizor.adresa,
      },
      lines: (dto.linii ?? []).map(invoiceLine),
    };
  },

  async invoiceTransactions(id: string) {
    return (await api.getTranzactiiFactura(id)).map(transaction);
  },

  async downloadInvoice(id: string) {
    const fisier = await api.getPdfFactura(id);
    downloadBase64(fisier.numeFisier ?? `factura-${id}.pdf`, fisier.contentBase64);
  },
};
