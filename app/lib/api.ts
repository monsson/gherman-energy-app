// Client REST pentru backendul CUBA (modulul `gp`).
//
// Autorizarea foloseste OAuth2 al addon-ului `restapi`:
//   POST /rest/v2/oauth/token    grant_type=password    -> access_token + refresh_token
//   POST /rest/v2/oauth/token    grant_type=refresh_token
//   POST /rest/v2/oauth/revoke                          -> invalideaza tokenul la iesire
// Apelurile de business merg pe serviciile din `rest-services.xml` (deocamdata doar
// gp_PwaAuthService), cu `Authorization: Bearer <access_token>`.

const trimSlash = (s: string) => s.replace(/\/+$/, "");

/** Radacina backendului, ex. `https://gp.exemplu.ro/app`. Gol = aplicatia ruleaza pe date demo. */
export const API_BASE = trimSlash(import.meta.env.VITE_API_BASE_URL ?? "");

/** Cand nu e configurat niciun backend, `auth.ts` cade pe conturile demo hardcodate. */
export const API_ENABLED = API_BASE.length > 0;

// Credentialele clientului OAuth2. Ajung inevitabil in bundle-ul din browser — CUBA cere Basic
// auth pe /oauth/token si nu are flow pentru clienti publici — deci trebuie tratate ca fiind
// publice: nu dau acces la nimic fara userul si parola, iar `cuba.rest.client.secret` din
// web-app.properties poate fi rotit oricand fara a atinge codul de aici.
const CLIENT_ID = import.meta.env.VITE_API_CLIENT_ID ?? "gp-iC8cROSH";
const CLIENT_SECRET = import.meta.env.VITE_API_CLIENT_SECRET ?? "";

const TOKENS_KEY = "ge.tokens";

/** Marja fata de expirarea reala, ca sa nu trimitem un token care pica intre check si request. */
const EXPIRY_SKEW_MS = 30_000;

export type Tokens = {
  accessToken: string;
  refreshToken: string | null;
  /** Timestamp absolut (ms), deja ajustat cu EXPIRY_SKEW_MS. */
  expiresAt: number;
};

/** Eroare de la server: `status` 0 inseamna ca requestul nu a ajuns (retea / CORS). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Sesiunea nu mai e valida (refresh esuat sau lipsa). Cel care prinde eroarea duce la login. */
export class SessionExpiredError extends Error {
  constructor() {
    super("Sesiune expirata");
    this.name = "SessionExpiredError";
  }
}

// ---------------------------------------------------------------- stocare tokeni

export function loadTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TOKENS_KEY);
  if (!raw) return null;
  try {
    const t = JSON.parse(raw) as Tokens;
    return typeof t?.accessToken === "string" ? t : null;
  } catch {
    return null;
  }
}

function saveTokens(tokens: Tokens) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  }
}

export function clearTokens() {
  if (typeof window !== "undefined") localStorage.removeItem(TOKENS_KEY);
  refreshInFlight = null;
}

// ---------------------------------------------------------------- endpointul de token

function basicAuthHeader(): string {
  return "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

async function tokenRequest(body: URLSearchParams): Promise<Tokens> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/rest/v2/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch {
    throw new ApiError(0, "Serverul nu raspunde.");
  }

  const payload = await readJson(res);

  if (!res.ok) {
    // CUBA intoarce 400 { error: "invalid_grant", error_description: "Bad credentials" }
    const code = typeof payload?.error === "string" ? payload.error : undefined;
    throw new ApiError(res.status, payload?.error_description ?? res.statusText, code);
  }

  const data = payload as TokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - EXPIRY_SKEW_MS,
  };
}

/** Autentificare cu utilizator si parola. Tokenii raman salvati pentru requesturile urmatoare. */
export async function requestToken(username: string, password: string): Promise<Tokens> {
  const tokens = await tokenRequest(
    new URLSearchParams({ grant_type: "password", username, password }),
  );
  saveTokens(tokens);
  return tokens;
}

// Un singur refresh in zbor: doua requesturi care primesc 401 simultan ar consuma altfel doua
// refresh tokenuri, iar CUBA il invalideaza pe cel folosit.
let refreshInFlight: Promise<Tokens> | null = null;

function refreshTokens(refreshToken: string): Promise<Tokens> {
  refreshInFlight ??= tokenRequest(
    new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  )
    .then((tokens) => {
      saveTokens(tokens);
      return tokens;
    })
    .catch((err) => {
      clearTokens();
      throw err instanceof ApiError && err.status === 0 ? err : new SessionExpiredError();
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/** Invalideaza tokenul curent la server. Esecul e ignorat — local il stergem oricum. */
export async function revokeToken(): Promise<void> {
  const tokens = loadTokens();
  if (!tokens) return;
  try {
    await fetch(`${API_BASE}/rest/v2/oauth/revoke`, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        token: tokens.accessToken,
        token_type_hint: "access_token",
      }),
    });
  } catch {
    // offline sau server picat — sesiunea locala se sterge oricum in `logout()`
  }
}

// ---------------------------------------------------------------- apeluri autorizate

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function validTokens(): Promise<Tokens> {
  const tokens = loadTokens();
  if (!tokens) throw new SessionExpiredError();
  if (tokens.expiresAt > Date.now()) return tokens;
  if (!tokens.refreshToken) {
    clearTokens();
    throw new SessionExpiredError();
  }
  return refreshTokens(tokens.refreshToken);
}

/**
 * Mesajul de eroare al serverului, in cele trei forme in care vine.
 *
 * Serviciile PWA arunca `CustomValidationException`, iar addon-ul REST o serializeaza ca *lista* de
 * incalcari - `[{path, invalidValue, message, messageTemplate}]` - nu ca obiect. Pe drumul asta ies
 * toate refuzurile de rol si toate erorile de validare, cu mesaj scris in romana pentru utilizator,
 * deci a-l pierde ar insemna sa aratam "Bad Request" in loc de "Doar un manager de flota are acces
 * la facturi.". Endpointul de token foloseste `error_description`, iar restul `message`.
 *
 * Exceptiile care **nu** sunt `@SupportedByClient` raman impachetate in `RemoteException` si ies ca
 * `{"error":"Server error","details":""}` - un text englezesc, generic, pe care nu are rost sa il
 * aratam unui utilizator. Pe acela il semnalam ca "fara mesaj folositor" (null), ca ecranul sa isi
 * puna propria explicatie.
 */
function mesajEroare(payload: any): string | null {
  if (Array.isArray(payload) && typeof payload[0]?.message === "string") {
    return payload[0].message;
  }
  if (typeof payload?.error_description === "string") return payload.error_description;
  if (typeof payload?.message === "string") return payload.message;
  return null;
}

/**
 * Request autorizat catre backend. La 401 incearca o singura data un refresh, apoi renunta cu
 * SessionExpiredError; un 403 inseamna rol fara permisiunea ceruta si se propaga ca ApiError.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  allowRetry = true,
): Promise<T> {
  const tokens = await validTokens();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });
  } catch {
    throw new ApiError(0, "Serverul nu raspunde.");
  }

  if (res.status === 401 && allowRetry) {
    const current = loadTokens();
    if (!current?.refreshToken) {
      clearTokens();
      throw new SessionExpiredError();
    }
    await refreshTokens(current.refreshToken);
    return apiFetch<T>(path, init, false);
  }

  const payload = await readJson(res);

  if (!res.ok) {
    if (res.status === 401) {
      clearTokens();
      throw new SessionExpiredError();
    }
    const message = mesajEroare(payload) || "Eroare la server.";
    throw new ApiError(res.status, message);
  }

  return payload as T;
}

// ---------------------------------------------------------------- apeluri de serviciu

const AUTH = "gp_PwaAuthService";
const FLOTA = "gp_PwaFlotaService";
const STATII = "gp_PwaStatiiService";
const FACTURI = "gp_PwaFacturiService";

type Params = Record<string, string | number | undefined>;

/**
 * Query string pentru o metoda de serviciu.
 *
 * REST API-ul CUBA alege metoda dupa setul *exact* de nume de parametri primiti
 * (`RestServicesConfiguration.paramsMatches`), deci o cerere care omite un parametru optional nu
 * gaseste metoda deloc. Se trimit mereu toti, cei nefolositi goi - de aceea `undefined` devine `""`,
 * nu o cheie lipsa.
 */
function query(params: Params): string {
  const sp = new URLSearchParams();
  for (const [nume, valoare] of Object.entries(params)) {
    sp.set(nume, valoare === undefined ? "" : String(valoare));
  }
  const text = sp.toString();
  return text ? `?${text}` : "";
}

function getService<T>(serviciu: string, metoda: string, params: Params = {}): Promise<T> {
  return apiFetch<T>(`/rest/v2/services/${serviciu}/${metoda}${query(params)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
}

function postService<T>(serviciu: string, metoda: string, body: unknown): Promise<T> {
  return apiFetch<T>(`/rest/v2/services/${serviciu}/${metoda}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * O lista de la un serviciu. Un raspuns gol vine ca `[]`, dar `readJson` intoarce `null` pentru un
 * corp gol, deci normalizam aici - niciun apelant nu trebuie sa se apere de `undefined.map`.
 */
async function listService<T>(serviciu: string, metoda: string, params: Params = {}): Promise<T[]> {
  return (await getService<T[] | null>(serviciu, metoda, params)) ?? [];
}

// Toate campurile in afara de `id` sunt optionale pentru ca serverul **omite campurile null** din
// JSON - nu le trimite ca `null`. Pe o masina fara date, `itp`, `segment` sau `soferId` pur si
// simplu nu apar in obiect.

// ---------------------------------------------------------------- gp_PwaAuthService

/** Rolul PWA asa cum vine din backend (`RolPwa`). */
export type RolPwa = "manager" | "sofer";

/** Oglinda lui `ro.gsdata.gp.pwa.CardPwa` - numarul vine deja mascat de la server. */
export type CardPwa = {
  id: string;
  nrCardMascat?: string;
  /**
   * Id din `FurnizorCarburant`: `rompetrol` / `mol` / `socar`. Lipseste pe cardurile carora nu li
   * s-a completat furnizorul in back-office. Fara el doua carduri ale aceluiasi sofer arata
   * identic, seria fiind mascata la ultimele patru cifre.
   */
  furnizor?: string;
};

/** Oglinda lui `ro.gsdata.gp.pwa.MasinaPwa`. */
export type MasinaPwa = {
  id: string;
  nrInmatriculare?: string;
  marca?: string;
  model?: string;
  /** `yyyy-MM-dd` - coloane de tip DATE, deci fara ora. */
  itp?: string;
  rca?: string;
  rovinieta?: string;
  anFabricatie?: number;
  /** Id-ul din `SegmentAuto`: `mica` / `autoutilitara`. */
  segment?: string;
  /** Id-ul din `TipCarburant`: `benzina` / `motorina` / `gpl`. */
  tipCarburant?: string;
  soferId?: string;
  soferNume?: string;
  /** Plafonul lunar adus din portal, **in litri**, pe masina (nu pe card, nu pe sofer). */
  limitaLunara?: number;
  consumatLunaCurentaLitri?: number;
  consumatLunaCurentaLei?: number;
};

/** Oglinda lui `ro.gsdata.gp.pwa.ProfilPwa`. */
export type ProfilPwa = {
  id: string;
  login: string;
  nume?: string;
  rol?: RolPwa;
  partenerId?: string;
  partenerNume?: string;
  carduri?: CardPwa[];
  /** Primele `MaxMasiniInProfil` (3) masini vizibile. Flota intreaga vine din `getMasini`. */
  masini?: MasinaPwa[];
  totalMasini?: number;
};

export function getProfilulMeu(): Promise<ProfilPwa> {
  return getService<ProfilPwa>(AUTH, "getProfilulMeu");
}

/** Oglinda lui `ro.gsdata.gp.pwa.RezultatSchimbareParola`. */
export type RezultatSchimbareParola = "OK" | "PAROLA_CURENTA_INCORECTA" | "PAROLA_PREA_SCURTA";

export async function schimbaParola(
  parolaCurenta: string,
  parolaNoua: string,
): Promise<RezultatSchimbareParola> {
  const raw = await postService<unknown>(AUTH, "schimbaParola", { parolaCurenta, parolaNoua });
  // Enum simplu: serializat ca sir, uneori text/plain cu ghilimele.
  return String(raw).replace(/^"|"$/g, "").trim() as RezultatSchimbareParola;
}

/**
 * Fisier livrat prin API - PWA-ul descarca, nu arhiveaza, deci nu exista FileDescriptor.
 *
 * Aceeasi forma pentru scanul unui document si pentru PDF-ul unei facturi: continutul vine in
 * base64, nu pe `/rest/v2/files/{id}`, fiindca rolurile PWA nu au permisiuni pe `sys$FileDescriptor`.
 * Nu poarta tip MIME - il deduce `download.ts` din extensia numelui.
 */
export type FisierPwa = {
  numeFisier?: string;
  contentBase64: string;
};

// ---------------------------------------------------------------- gp_PwaFlotaService

/** `MasinaPwa` + ce nu are rost sa calatoreasca pentru fiecare rand din flota. */
export type MasinaDetaliuPwa = {
  masina: MasinaPwa;
  soferCardMascat?: string;
};

/** Oglinda lui `ro.gsdata.gp.pwa.SoferPwa`. Fara plafon si fara consum - alea stau pe masina. */
export type SoferPwa = {
  id: string;
  nume?: string;
  cardMascat?: string;
};

/**
 * Oglinda lui `ro.gsdata.gp.pwa.MasinaFormPwa`. `id` gol = creare.
 *
 * `itp`/`rca`/`rovinieta` **nu** se mai trimit inapoi la salvare: termenele nu mai sunt coloane pe
 * `Masina`, ci se deduc din documente. Se schimba numai prin `incarcaDocumentMasina`.
 */
export type MasinaFormPwa = {
  id?: string;
  nrInmatriculare: string;
  marca: string;
  model: string;
  anFabricatie?: number;
  segment?: string;
  tipCarburant?: string;
  soferId?: string;
};

/** Oglinda lui `ro.gsdata.gp.pwa.TranzactiePwa`. */
export type TranzactiePwa = {
  id: string;
  /** `yyyy-MM-dd'T'HH:mm:ss`, text ISO ca sa nu depindem de serializarea CUBA. */
  data?: string;
  masinaId?: string;
  nrInmatriculare?: string;
  /** Id din `TipCarburant`, nu denumirea comerciala din portal. */
  tipCombustibil?: string;
  /** Id din `FurnizorCarburant`. Azi `rompetrol` pe toate randurile - vezi `Supplier` in `fleet.ts`. */
  furnizor?: string;
  cantitate?: number;
  pretLitru?: number;
  totalValoare?: number;
  /** Lipseste cand importul nu a potrivit statia in nomenclator - `numeStatie` ramane. */
  statieId?: string;
  numeStatie?: string;
  /** Kilometrajul introdus la pompa. */
  kilometri?: number;
  /** Kilometri de la alimentarea anterioara a aceleiasi masini. */
  kmParcursi?: number;
  nrFactura?: string;
};

/** Oglinda lui `ro.gsdata.gp.pwa.SumarLunaPwa`. */
export type SumarLunaPwa = {
  /** `yyyy-MM`. Eticheta o formateaza frontendul, in limba lui. */
  luna: string;
  litri?: number;
  km?: number;
  /** Lipseste (nu e zero) cand luna nu are distanta. */
  consumMediu?: number;
  total?: number;
};

export function getMasini(): Promise<MasinaPwa[]> {
  return listService<MasinaPwa>(FLOTA, "getMasini");
}

/** Refuza o masina din afara flotei vizibile, nu intoarce gol. */
export function getMasina(idMasina: string): Promise<MasinaDetaliuPwa> {
  return getService<MasinaDetaliuPwa>(FLOTA, "getMasina", { idMasina });
}

export function getSoferi(): Promise<SoferPwa[]> {
  return listService<SoferPwa>(FLOTA, "getSoferi");
}

export function salveazaMasina(masina: MasinaFormPwa): Promise<MasinaPwa> {
  // Parametrul se numeste `masina` in rest-services.xml, deci formul merge invelit.
  return postService<MasinaPwa>(FLOTA, "salveazaMasina", { masina });
}

export type FiltruTranzactii = {
  idMasina?: string;
  idStatie?: string;
  idSofer?: string;
  /** `yyyy-MM-dd`. Implicit serverul acopera ultimele 30 de zile; intervalul maxim e 366. */
  dataInceput?: string;
  dataSfarsit?: string;
  /** Coboara plafonul de randuri; nu il poate ridica peste cel implicit (1000). */
  limita?: number;
};

export function getTranzactii(filtru: FiltruTranzactii = {}): Promise<TranzactiePwa[]> {
  return listService<TranzactiePwa>(FLOTA, "getTranzactii", {
    idMasina: filtru.idMasina,
    idStatie: filtru.idStatie,
    idSofer: filtru.idSofer,
    dataInceput: filtru.dataInceput,
    dataSfarsit: filtru.dataSfarsit,
    limita: filtru.limita,
  });
}

/** Implicit ultimele 6 luni, maxim 24. Lunile fara alimentari vin ca zerouri. */
export function getSumarLunar(idMasina?: string, luni?: number): Promise<SumarLunaPwa[]> {
  return listService<SumarLunaPwa>(FLOTA, "getSumarLunar", { idMasina, luni });
}

/** Id-ul din `DocumentMasinaTip` - aceleasi trei termene pe care le poarta si `MasinaPwa`. */
export type TipDocumentMasina = "itp" | "rca" | "rovinieta";

/**
 * Oglinda lui `ro.gsdata.gp.pwa.DocumentMasinaPwa` - un rand din documentele masinii.
 *
 * Lista vine gata ordonata pentru ecran: pe tip, iar in interiorul tipului de la termenul cel mai
 * indepartat spre cel mai vechi. Primul rand al unui tip este documentul curent si poarta
 * `curent: true`; restul sunt reinnoirile dinaintea lui. Randurile fara termen nu apar deloc.
 *
 * `curent` si `areScan` sunt `boolean` primitiv in DTO, deci vin mereu - spre deosebire de restul
 * campurilor, pe care serverul le omite cand sunt null.
 */
export type DocumentMasinaPwa = {
  id: string;
  /** Id din `DocumentMasinaTip`; un tip necunoscut frontendului se ignora. */
  tip?: string;
  /** `yyyy-MM-dd`. */
  dataEmitere?: string;
  dataExpirare?: string;
  curent: boolean;
  /** Documentul are scan. Pe un rand din istoric **nu** inseamna ca se poate descarca. */
  areScan: boolean;
  numeFisier?: string;
  dimensiuneOcteti?: number;
};

/** Oglinda lui `ro.gsdata.gp.pwa.DocumentMasinaFormPwa`. */
export type DocumentMasinaFormPwa = {
  idMasina: string;
  tip: string;
  /** `yyyy-MM-dd`. */
  dataEmitere?: string;
  /** Obligatorie: un rand fara termen nu ar fi niciodata cel curent, deci nu s-ar putea descarca. */
  dataExpirare: string;
  /** Cu tot cu extensie - ea decide daca fisierul e acceptat (`pdf`, `jpg`, `jpeg`, `png`). */
  numeFisier: string;
  /** Acceptat si ca data URL, cum il da un `<input type="file">` din browser. */
  continutBase64: string;
};

/** Documentele masinii, cu istoric. Le citeste oricine vede masina. */
export function getDocumenteMasina(idMasina: string): Promise<DocumentMasinaPwa[]> {
  return listService<DocumentMasinaPwa>(FLOTA, "getDocumenteMasina", { idMasina });
}

/**
 * Scanul documentului **curent** al tipului cerut.
 *
 * Refuza, cu mesaje diferite, masina fara niciun document de tipul cerut si documentul care exista
 * doar ca termen - de aceea ecranul cere fisierul numai cand `curent && areScan`, in loc sa afle
 * din eroare. Un scan din istoric nu se poate descarca deloc.
 */
export function getDocumentMasina(idMasina: string, tip: string): Promise<FisierPwa> {
  return getService<FisierPwa>(FLOTA, "getDocumentMasina", { idMasina, tip });
}

/**
 * Salveaza un scan nou. **Doar rolul manager** - un sofer primeste refuz inainte de orice citire.
 *
 * Randul se cauta dupa (masina, tip, `dataExpirare`): acelasi termen inseamna acelasi document,
 * deci scanul il inlocuieste pe cel vechi; un termen diferit creeaza randul unei reinnoiri.
 * Intoarce masina cu termenele reasezate.
 */
export function incarcaDocumentMasina(document: DocumentMasinaFormPwa): Promise<MasinaPwa> {
  // Parametrul se numeste `document` in rest-services.xml, deci formul merge invelit.
  return postService<MasinaPwa>(FLOTA, "incarcaDocumentMasina", { document });
}

// ---------------------------------------------------------------- gp_PwaStatiiService

/** Oglinda lui `ro.gsdata.gp.pwa.StatiePwa`. */
export type StatiePwa = {
  id: string;
  nume?: string;
  /** Deocamdata absenta pe toate statiile - nu se introduce de nicaieri automat. */
  adresa?: string;
  pretBenzinaCuTva?: number;
  pretMotorinaCuTva?: number;
  /** `yyyy-MM-dd`. Se afiseaza, ca preturile sa nu para live de la pompa. */
  dataActualizarePret?: string;
};

export function getStatii(): Promise<StatiePwa[]> {
  return listService<StatiePwa>(STATII, "getStatii");
}

export function getStatie(idStatie: string): Promise<StatiePwa> {
  return getService<StatiePwa>(STATII, "getStatie", { idStatie });
}

/**
 * Top preturi. `tipCarburant` gol = ordonare dupa suma celor doua preturi.
 *
 * Accepta doar `benzina` / `motorina`: statiile nu tin pret pentru GPL, iar un `gpl` este refuzat
 * cu 400. Implicit 3 statii, maxim 20.
 */
export function getStatiiIeftine(
  tipCarburant?: "benzina" | "motorina",
  limita?: number,
): Promise<StatiePwa[]> {
  return listService<StatiePwa>(STATII, "getStatiiIeftine", { tipCarburant, limita });
}

// ---------------------------------------------------------------- gp_PwaFacturiService

/** Oglinda lui `ro.gsdata.gp.pwa.FacturaPwa`. `status` e derivat din `sold`. */
export type FacturaPwa = {
  id: string;
  /** Serie + numar de registru. */
  numar?: string;
  /** `yyyy-MM-dd`. */
  data?: string;
  scadenta?: string;
  totalFaraTva?: number;
  tva?: number;
  totalCuTva?: number;
  sold?: number;
  status?: "platita" | "neplatita";
};

/** Oglinda lui `ro.gsdata.gp.pwa.FacturaLiniePwa`. */
export type FacturaLiniePwa = {
  nrLinie?: number;
  denumire?: string;
  cnt?: number;
  um?: string;
  pretFaraTva?: number;
  totalFaraTva?: number;
  totalCuTva?: number;
};

/** Emitentul facturii - pe o factura client, Gherman Properties. Nu partenerul. */
export type FurnizorPwa = {
  nume?: string;
  cui?: string;
  adresa?: string;
};

export type FacturaDetaliuPwa = {
  factura: FacturaPwa;
  furnizor?: FurnizorPwa;
  linii?: FacturaLiniePwa[];
};

/** Implicit ultimul an; interval maxim 366 de zile, cel mult 500 de randuri. Doar rolul manager. */
export function getFacturi(dataInceput?: string, dataSfarsit?: string): Promise<FacturaPwa[]> {
  return listService<FacturaPwa>(FACTURI, "getFacturi", { dataInceput, dataSfarsit });
}

export function getFactura(idFactura: string): Promise<FacturaDetaliuPwa> {
  return getService<FacturaDetaliuPwa>(FACTURI, "getFactura", { idFactura });
}

export function getPdfFactura(idFactura: string): Promise<FisierPwa> {
  return getService<FisierPwa>(FACTURI, "getPdfFactura", { idFactura });
}

/**
 * Alimentarile facturate, pe perioada din dosarul facturii.
 *
 * Lista goala este un raspuns valid: factura nu este Rompetrol, ori luna ei nu are inca alimentari
 * descarcate. Atribuirea este pe perioada, nu exacta - vezi *Tranzactiile unei facturi* in planul
 * de backend.
 */
export function getTranzactiiFactura(idFactura: string): Promise<TranzactiePwa[]> {
  return listService<TranzactiePwa>(FACTURI, "getTranzactiiFactura", { idFactura });
}
