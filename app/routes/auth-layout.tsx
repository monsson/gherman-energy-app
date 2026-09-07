import { useEffect, useState } from "react";
import { Navigate, Outlet, useOutletContext } from "react-router";
import { Center, Loader } from "@mantine/core";
import { getSession, refreshSession, type Session } from "~/lib/auth";

type Ctx = { session: Session };

export default function AuthLayout() {
  const [state, setState] = useState<{ ready: boolean; session: Session | null }>({
    ready: false,
    session: null,
  });

  useEffect(() => {
    let alive = true;
    const stored = getSession();
    setState({ ready: true, session: stored });
    if (!stored) return;

    // Afisam imediat sesiunea din localStorage si verificam autorizarea in paralel: daca tokenul
    // nu mai e valid si nici refreshul nu reuseste, `refreshSession` intoarce null si cadem pe login.
    void refreshSession().then((session) => {
      if (alive) setState({ ready: true, session });
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
  if (!state.session) return <Navigate to="/" replace />;

  return <Outlet context={{ session: state.session } satisfies Ctx} />;
}

export function useSession() {
  return useOutletContext<Ctx>().session;
}
