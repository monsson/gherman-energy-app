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

export function login(username: string, password: string): Session | null {
  const acc = ACCOUNTS.find(
    (a) => a.username === username.trim().toLowerCase() && a.password === password,
  );
  if (!acc) return null;
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(acc.session));
  }
  return acc.session;
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
