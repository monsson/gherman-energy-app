// Sesiunea aplicatiei.
//
// Cand `VITE_API_BASE_URL` este setat, autentificarea merge prin backendul CUBA (vezi `api.ts`):
// token OAuth2 + profilul din `gp_PwaAuthService`. Fara acea variabila aplicatia ruleaza in modul
// demo, cu conturile hardcodate de mai jos — asa ramane functionala si publicarea de pe GitHub
// Pages, care nu are backend in spate.

import { COMPANY } from "./company";
import {
  API_ENABLED,
  ApiError,
  clearTokens,
  getProfilulMeu,
  loadTokens,
  requestToken,
  revokeToken,
  schimbaParola,
  SessionExpiredError,
  type CardPwa,
  type MasinaPwa,
  type ProfilPwa,
} from "./api";

export type Role = "manager" | "driver";

export type Session = {
  role: Role;
  username: string;
  /**
   * Soferul din datele demo (`data.ts`), pe care `fleet.demo.ts` il foloseste ca sa restranga
   * flota vizibila. Exista **doar pe sesiunile demo**: intr-o sesiune pe API vizibilitatea o
   * impune serverul, iar o punte catre un sofer fictiv ar fi ascuns exact asta.
   */
  driverId?: string;
  /** `api` = sesiune reala pe backend, `demo` = cont hardcodat. */
  source: "api" | "demo";
  /** Campurile de mai jos vin din `ProfilPwa` si exista doar pe sesiunile `api`. */
  userId?: string;
  name?: string;
  partenerId?: string | null;
  partenerNume?: string | null;
  cards?: CardPwa[];
  /** Primele 3 masini vizibile, cat afiseaza dashboardul. Flota intreaga vine din `fleet.listCars`. */
  cars?: MasinaPwa[];
  /** Numarul real de masini vizibile, pentru eticheta "Masini (N)". */
  totalCars?: number;
};

const KEY = "ge.session";

/** Impusa de `PwaAuthServiceBean.LungimeMinimaParola`; o verificam si local, sa nu facem drumul degeaba. */
export const MIN_PASSWORD_LENGTH = 6;

// ---------------------------------------------------------------- conturi demo

const ACCOUNTS: { username: string; password: string; session: Session }[] = [
  {
    username: "fleet",
    password: "fleet",
    session: {
      role: "manager",
      username: "fleet",
      source: "demo",
      name: "Fleet Manager",
      partenerNume: COMPANY.legalName,
    },
  },
  {
    username: "sofer",
    password: "sofer",
    // Legat de soferul #1 din datele demo. Numele il ia ecranul din lista de soferi, ca sa nu fie
    // scris de doua ori - aici si in samanta din `data.ts`.
    session: {
      role: "driver",
      username: "sofer",
      driverId: "1",
      source: "demo",
      partenerNume: COMPANY.legalName,
    },
  },
];

// Password overrides set by the user from the in-app "change password" form.
// Stored separately so the hardcoded demo defaults stay as a fallback.
const PW_KEY = "ge.passwords";

function passwordOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PW_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function effectivePassword(username: string, fallback: string): string {
  return passwordOverrides()[username] ?? fallback;
}

// ---------------------------------------------------------------- stocarea sesiunii

function saveSession(session: Session) {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(session));
  }
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  let session: Session;
  try {
    session = JSON.parse(raw) as Session;
  } catch {
    return null;
  }
  // Sesiunile salvate inainte de integrarea cu backendul nu au `source`.
  session.source ??= "demo";
  // `driverId` a fost numar pana la migrarea pe id-uri de text; o sesiune veche ramasa in browser
  // ar compara 1 cu "1" si soferul si-ar vedea flota goala.
  if (typeof session.driverId === "number") session.driverId = String(session.driverId);
  // O sesiune `api` fara tokeni nu mai poate apela nimic — o tratam ca inexistenta.
  if (session.source === "api" && !loadTokens()) return null;
  return session;
}

function clearSession() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

// ---------------------------------------------------------------- login

export type LoginErrorCode =
  | "bad-credentials"
  | "unreachable"
  | "forbidden"
  | "not-pwa-user"
  | "unknown";

export class LoginError extends Error {
  constructor(readonly code: LoginErrorCode) {
    super(code);
    this.name = "LoginError";
  }
}

/** Rolul din backend (`RolPwa`) in rolul folosit de rutele aplicatiei. */
function mapRole(rol: ProfilPwa["rol"]): Role | null {
  if (rol === "manager") return "manager";
  if (rol === "sofer") return "driver";
  return null;
}

function sessionFromProfile(profile: ProfilPwa): Session {
  const role = mapRole(profile.rol);
  if (!role) throw new LoginError("not-pwa-user");
  return {
    role,
    username: profile.login,
    source: "api",
    userId: profile.id,
    name: profile.nume ?? profile.login,
    partenerId: profile.partenerId,
    partenerNume: profile.partenerNume,
    cards: profile.carduri ?? [],
    cars: profile.masini ?? [],
    totalCars: profile.totalMasini ?? profile.masini?.length ?? 0,
  };
}

function loginDemo(username: string, password: string): Session {
  const acc = ACCOUNTS.find((a) => a.username === username.trim().toLowerCase());
  if (!acc || effectivePassword(acc.username, acc.password) !== password) {
    throw new LoginError("bad-credentials");
  }
  saveSession(acc.session);
  return acc.session;
}

/** Autentificare. Arunca `LoginError` cu un cod pe care formularul il traduce in mesaj. */
export async function login(username: string, password: string): Promise<Session> {
  if (!API_ENABLED) return loginDemo(username, password);

  const user = username.trim();

  try {
    await requestToken(user, password);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 0) throw new LoginError("unreachable");
      // `invalid_grant` acopera si parola gresita, si contul inactiv.
      if (err.code === "invalid_grant" || err.status === 400 || err.status === 401) {
        throw new LoginError("bad-credentials");
      }
      // Fara permisiunea `cuba.restApi.enabled` (rolurile pwa-*) tokenul e refuzat cu 403.
      if (err.status === 403) throw new LoginError("forbidden");
    }
    throw new LoginError("unknown");
  }

  try {
    const session = sessionFromProfile(await getProfilulMeu());
    saveSession(session);
    return session;
  } catch (err) {
    // Token valid, dar profilul nu se poate incarca: utilizator de back-office, rol PWA lipsa
    // sau serviciu indisponibil. Nu lasam tokenul in urma.
    await logout();
    if (err instanceof LoginError) throw err;
    if (err instanceof ApiError) {
      if (err.status === 0) throw new LoginError("unreachable");
      if (err.status === 403) throw new LoginError("forbidden");
      // IllegalStateException din `getProfilulMeu` iese ca 500.
      if (err.status === 500) throw new LoginError("not-pwa-user");
    }
    throw new LoginError("unknown");
  }
}

// ---------------------------------------------------------------- reincarcare profil

/**
 * Reciteste profilul si reimprospateaza sesiunea salvata. Intoarce `null` daca autorizarea nu mai
 * este valida (token expirat si refresh esuat) — apelantul duce atunci utilizatorul la login.
 * Erorile de retea lasa sesiunea existenta neatinsa, ca aplicatia sa functioneze si offline.
 */
export async function refreshSession(): Promise<Session | null> {
  const current = getSession();
  if (!current) return null;
  if (current.source !== "api") return current;

  try {
    const session = sessionFromProfile(await getProfilulMeu());
    saveSession(session);
    return session;
  } catch (err) {
    if (err instanceof SessionExpiredError || err instanceof LoginError) {
      clearSession();
      clearTokens();
      return null;
    }
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      clearSession();
      clearTokens();
      return null;
    }
    return current;
  }
}

// ---------------------------------------------------------------- schimbare parola

export type ChangePasswordResult =
  | "ok"
  | "wrong-current"
  | "too-short"
  | "no-user"
  | "expired"
  | "error";

function changePasswordDemo(
  username: string,
  current: string,
  next: string,
): ChangePasswordResult {
  const acc = ACCOUNTS.find((a) => a.username === username);
  if (!acc) return "no-user";
  if (effectivePassword(acc.username, acc.password) !== current) return "wrong-current";
  if (next.length < MIN_PASSWORD_LENGTH) return "too-short";
  if (typeof window !== "undefined") {
    const all = passwordOverrides();
    all[username] = next;
    localStorage.setItem(PW_KEY, JSON.stringify(all));
  }
  return "ok";
}

export async function changePassword(
  username: string,
  current: string,
  next: string,
): Promise<ChangePasswordResult> {
  if (getSession()?.source !== "api") return changePasswordDemo(username, current, next);
  if (next.length < MIN_PASSWORD_LENGTH) return "too-short";

  try {
    const result = await schimbaParola(current, next);
    if (result === "OK") return "ok";
    if (result === "PAROLA_CURENTA_INCORECTA") return "wrong-current";
    if (result === "PAROLA_PREA_SCURTA") return "too-short";
    return "error";
  } catch (err) {
    if (err instanceof SessionExpiredError) {
      clearSession();
      return "expired";
    }
    // Restul erorilor pleaca mai departe ca `ApiError`: refuzurile de rol si validarile serverului
    // vin cu mesaj scris in romana pentru utilizator, iar aici l-am pierde sub un "error" generic.
    throw err;
  }
}

// ---------------------------------------------------------------- logout

export async function logout(): Promise<void> {
  if (API_ENABLED) await revokeToken();
  clearTokens();
  clearSession();
}
