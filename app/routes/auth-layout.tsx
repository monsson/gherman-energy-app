import { useEffect, useState } from "react";
import { Navigate, Outlet, useOutletContext } from "react-router";
import { getSession, type Session } from "~/lib/auth";

type Ctx = { session: Session };

export default function AuthLayout() {
  const [state, setState] = useState<{ ready: boolean; session: Session | null }>({
    ready: false,
    session: null,
  });

  useEffect(() => {
    setState({ ready: true, session: getSession() });
  }, []);

  if (!state.ready) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-slate-400 text-sm">
        Se încarcă…
      </div>
    );
  }
  if (!state.session) return <Navigate to="/" replace />;

  return <Outlet context={{ session: state.session } satisfies Ctx} />;
}

export function useSession() {
  return useOutletContext<Ctx>().session;
}
