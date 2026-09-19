import { useEffect, useRef, useState } from "react";
import { carLimit, getCar, type LimitPeriod, roundLiters } from "./fleet";

/** Ce se urmareste: plafonul cerut, tinut minte pana cand portalul raspunde. */
export type LimitWatch = { period: LimitPeriod; liters: number };

/**
 * Cum s-a incheiat urmarirea.
 *
 * `timedOut` nu este o eroare: cererea ramane in coada si se aplica oricand mai tarziu, doar ca noi
 * nu mai stam sa ne uitam.
 */
export type LimitOutcome = LimitWatch & {
  accepted: boolean;
  timedOut?: boolean;
  /** Motivul refuzului, asa cum l-a scris serverul. Lipseste pe o confirmare si pe o deducere. */
  message?: string;
};

/** Cat de des intrebam serverul. Un `getMasina` pe o singura masina, doar cu fila la vedere. */
const POLL_MS = 15_000;

/**
 * Cat timp asteptam inainte sa renuntam.
 *
 * Taskul din backend ruleaza pe `0 2/5 * * * *`, deci o cerere asteapta cel mult cinci minute pana
 * este luata in seama, plus cateva secunde de drum pana la portal si inapoi. Sapte minute lasa
 * destula marja fara sa tina o fila sa intrebe la nesfarsit.
 */
const WATCH_MS = 7 * 60_000;

/**
 * Urmareste o cerere de plafon pana cand portalul raspunde.
 *
 * Exista pentru ca **raspunsul nu vine singur**: cererea pleaca spre portal abia la urmatoarea
 * rulare a taskului programat, iar ecranul ar afla doar daca utilizatorul se intampla sa reincarce
 * pagina. Fara asta, un manager trimite, vede "in curs de modificare" si acela ramane ultimul lucru
 * care i se spune.
 *
 * Rezultatul se citeste din `limitAnswer`, pe care serverul il trimite pentru cererile inchise in
 * ultimele 24 de ore, cu tot cu motivul refuzului. Cand lipseste - fereastra a trecut, sau citirea
 * lui a picat pe server, unde este sub o plasa de siguranta ca sa nu doboare raspunsul - se cade pe
 * **deducere**: stim ce s-a cerut, deci plafonul ajuns acolo inseamna acceptata, iar plafonul ramas
 * neschimbat inseamna respinsa. Atunci se pierde doar motivul, nu si verdictul.
 */
export function useLimitWatch(carId: string, onResolved?: () => void) {
  const [watch, setWatch] = useState<LimitWatch | null>(null);
  const [outcome, setOutcome] = useState<LimitOutcome | null>(null);

  // Intra prin ref, ca o functie noua la fiecare randare sa nu reporneasca urmarirea.
  const resolvedRef = useRef(onResolved);
  resolvedRef.current = onResolved;

  useEffect(() => {
    if (!watch) return;

    const { period, liters } = watch;
    const deadline = Date.now() + WATCH_MS;
    let alive = true;

    const timer = setInterval(async () => {
      if (!alive) return;

      if (Date.now() > deadline) {
        clearInterval(timer);
        setWatch(null);
        setOutcome({ period, liters, accepted: false, timedOut: true });
        return;
      }

      // O fila din fundal nu se uita la nimic, deci nu intrebam pentru ea. Termenul de mai sus
      // ramane pe ceas, nu pe numarul de incercari: cine revine dupa zece minute a pierdut oricum
      // momentul, iar cererea se vede la urmatoarea incarcare a paginii.
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      let fresh;
      try {
        fresh = await getCar(carId);
      } catch {
        // O citire picata nu incheie urmarirea: reteaua revine, iar cererea este tot acolo.
        return;
      }
      if (!alive) return;

      // Cat timp cererea este inca deschisa pe aceeasi perioada, nu s-a intamplat nimic.
      if (fresh.pendingLimitPeriod === period) return;

      clearInterval(timer);
      setWatch(null);

      // Raspunsul serverului este al *celei mai recent inchise* cereri, care pe o masina cu cereri
      // pe plafoane diferite poate fi alta decat a noastra - de aceea se verifica perioada.
      const answer = fresh.limitAnswer?.period === period ? fresh.limitAnswer : undefined;
      const now = carLimit(fresh, period);

      setOutcome({
        period,
        liters,
        accepted: answer
          ? answer.state === "confirmata"
          : now != null && roundLiters(now) === roundLiters(liters),
        message: answer?.message,
      });
      resolvedRef.current?.();
    }, POLL_MS);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [carId, watch]);

  return {
    /** Cererea urmarita acum, sau `null`. */
    watch,
    /** Rezultatul ultimei cereri incheiate, pana cand utilizatorul il inchide. */
    outcome,
    start(period: LimitPeriod, liters: number) {
      setOutcome(null);
      setWatch({ period, liters });
    },
    dismiss() {
      setOutcome(null);
    },
  };
}
