import { useEffect, useState } from "react";
import { Navigate, Outlet, useOutletContext } from "react-router";
import { Center, Loader } from "@mantine/core";
import { getSession, refreshSession, type Session } from "~/lib/auth";
import type { LoginState } from "./login";

type Ctx = { session: Session };

export default function AuthLayout() {
  // `expired` separa cele doua drumuri catre login: o sesiune care a picat la revalidare (mesaj
  // de sesiune expirata) si un URL protejat deschis fara sesiune (invitatie la autentificare).
  const [state, setState] = useState<{
    ready: boolean;
    session: Session | null;
    expired: boolean;
  }>({ ready: false, session: null, expired: false });

  useEffect(() => {
    let alive = true;
    const stored = getSession();
    setState({ ready: true, session: stored, expired: false });
    if (!stored) return;

    // Afisam imediat sesiunea din localStorage si verificam autorizarea in paralel: daca tokenul
    // nu mai e valid si nici refreshul nu reuseste, `refreshSession` intoarce null si cadem pe login.
    void refreshSession().then((session) => {
      if (alive) setState({ ready: true, session, expired: session === null });
    });

    return () => {
      alive = false;
    };
  }, []);

  if (!state.ready) {
    return (
      <Center mih="100dvh">
        <Loader size="md" type="dots" />
      </Center>
    );
  }
  if (!state.session) {
    const notice: LoginState = { notice: state.expired ? "expired" : "sign-in-required" };
    return <Navigate to="/" replace state={notice} />;
  }

  return <Outlet context={{ session: state.session } satisfies Ctx} />;
}

export function useSession() {
  return useOutletContext<Ctx>().session;
}
