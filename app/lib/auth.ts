// Hardcoded credentials for the prototype. Persisted in localStorage so a
// page refresh keeps you signed in.

export type Role = "manager" | "driver";
export type Session = { role: Role; username: string; driverId?: number };

const KEY = "ge.session";

const ACCOUNTS: { username: string; password: string; session: Session }[] = [
  {
    username: "fleet",
    password: "fleet",
    session: { role: "manager", username: "fleet" },
  },
  {
    username: "sofer",
    password: "sofer",
    // Maps to driver #1 (Andrei Popescu / car #1).
    session: { role: "driver", username: "sofer", driverId: 1 },
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

export function login(username: string, password: string): Session | null {
  const acc = ACCOUNTS.find((a) => a.username === username.trim().toLowerCase());
  if (!acc || effectivePassword(acc.username, acc.password) !== password) return null;
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(acc.session));
  }
  return acc.session;
}

export type ChangePasswordResult = "ok" | "wrong-current" | "too-short" | "no-user";

export function changePassword(
  username: string,
  current: string,
  next: string,
): ChangePasswordResult {
  const acc = ACCOUNTS.find((a) => a.username === username);
  if (!acc) return "no-user";
  if (effectivePassword(acc.username, acc.password) !== current) return "wrong-current";
  if (next.length < 4) return "too-short";
  if (typeof window !== "undefined") {
    const all = passwordOverrides();
    all[username] = next;
    localStorage.setItem(PW_KEY, JSON.stringify(all));
  }
  return "ok";
}

export function logout() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}
