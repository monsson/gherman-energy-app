import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Logo } from "~/components/Logo";
import { getSession, login } from "~/lib/auth";

export function meta() {
  return [{ title: "Login — Gherman Energy" }];
}

export default function LoginRoute() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (s) navigate(s.role === "manager" ? "/manager" : "/driver", { replace: true });
  }, [navigate]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const session = login(username, password);
    if (!session) {
      setError("Utilizator sau parolă incorecte.");
      return;
    }
    navigate(session.role === "manager" ? "/manager" : "/driver", { replace: true });
  }

  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-3 text-center text-white mb-8">
            <Logo size={84} tone="dark" />
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Gherman Energy</h1>
              <p className="text-brand-100 mt-1">Aplicație flotă & șoferi</p>
            </div>
          </div>

          <form
            onSubmit={submit}
            className="bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4"
          >
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Utilizator
              </span>
              <input
                type="text"
                autoCapitalize="none"
                autoComplete="username"
                inputMode="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="ex: fleet"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Parolă
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </label>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold py-3.5 rounded-xl shadow"
            >
              Intră în cont
            </button>

            <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-700">Conturi demo:</strong>
              <div className="mt-1 space-y-0.5 font-mono">
                <div>fleet / fleet — Fleet Manager</div>
                <div>sofer / sofer — Șofer</div>
              </div>
            </div>
          </form>
        </div>
      </div>
      <footer className="text-center text-xs text-brand-100 pb-4">
        © Gherman Energy · Prototip
      </footer>
    </main>
  );
}
