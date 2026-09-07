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
    const message =
      (typeof payload?.error_description === "string" && payload.error_description) ||
      (typeof payload?.message === "string" && payload.message) ||
      res.statusText ||
      "Eroare la server.";
    throw new ApiError(res.status, message);
  }

  return payload as T;
}

// ---------------------------------------------------------------- gp_PwaAuthService

const SERVICE = "/rest/v2/services/gp_PwaAuthService";

/** Rolul PWA asa cum vine din backend (`RolPwa`). */
export type RolPwa = "manager" | "sofer";

/** Oglinda lui `ro.gsdata.gp.pwa.CardPwa` — numarul de card vine deja mascat de la server. */
export type CardPwa = {
  id: string;
  nrCardMascat: string | null;
  limitaLunara: number | null;
};

/** Oglinda lui `ro.gsdata.gp.pwa.MasinaPwa`. */
export type MasinaPwa = {
  id: string;
  nrInmatriculare: string | null;
  marca: string | null;
  model: string | null;
};

/** Oglinda lui `ro.gsdata.gp.pwa.ProfilPwa`. */
export type ProfilPwa = {
  id: string;
  login: string;
  nume: string | null;
  rol: RolPwa | null;
  partenerId: string | null;
  partenerNume: string | null;
  carduri: CardPwa[];
  masini: MasinaPwa[];
};

export function getProfilulMeu(): Promise<ProfilPwa> {
  return apiFetch<ProfilPwa>(`${SERVICE}/getProfilulMeu`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
}

/** Oglinda lui `ro.gsdata.gp.pwa.RezultatSchimbareParola`. */
export type RezultatSchimbareParola = "OK" | "PAROLA_CURENTA_INCORECTA" | "PAROLA_PREA_SCURTA";

export async function schimbaParola(
  parolaCurenta: string,
  parolaNoua: string,
): Promise<RezultatSchimbareParola> {
  const raw = await apiFetch<unknown>(`${SERVICE}/schimbaParola`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ parolaCurenta, parolaNoua }),
  });
  // Enum simplu: serializat ca sir, uneori text/plain cu ghilimele.
  return String(raw).replace(/^"|"$/g, "").trim() as RezultatSchimbareParola;
}
