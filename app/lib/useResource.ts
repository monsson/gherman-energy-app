import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, SessionExpiredError } from "./api";

export type Resource<T> = {
  /** Ramane pe valoarea anterioara in timpul unei reincarcari, ca ecranul sa nu clipeasca. */
  data: T | null;
  /** Mesajul serverului, scris in romana pentru utilizator. */
  error: string | null;
  /** Autorizarea nu mai e valida - apelantul duce la login. */
  expired: boolean;
  loading: boolean;
  reload: () => void;
};

function message(err: unknown): string {
  if (err instanceof ApiError && err.status === 0) return "Serverul nu răspunde.";
  if (err instanceof Error && err.message) return err.message;
  return "Datele nu au putut fi încărcate.";
}

/**
 * Incarca o resursa asincrona intr-un ecran.
 *
 * `load` se citeste dintr-un ref, deci poate fi o functie noua la fiecare randare fara sa
 * relanseze cererea; ce declanseaza reincarcarea este `deps`, ca la `useEffect`. Cererea in zbor
 * la demontare nu mai scrie in state.
 */
export function useResource<T>(load: () => Promise<T>, deps: unknown[] = []): Resource<T> {
  const loadRef = useRef(load);
  loadRef.current = load;

  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<Omit<Resource<T>, "reload">>({
    data: null,
    error: null,
    expired: false,
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loadRef.current().then(
      (data) => {
        if (alive) setState({ data, error: null, expired: false, loading: false });
      },
      (err: unknown) => {
        if (!alive) return;
        setState({
          data: null,
          error: message(err),
          expired: err instanceof SessionExpiredError,
          loading: false,
        });
      },
    );
    return () => {
      alive = false;
    };
    // `load` intra prin ref, deci nu are ce cauta in lista de dependente.
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
