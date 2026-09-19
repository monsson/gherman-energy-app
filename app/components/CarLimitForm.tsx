import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import {
  type Car,
  carLimit,
  formatLimitLiters,
  LEI_ESTIMATE_SOURCE_LABEL,
  LIMIT_MAX_LITERS,
  LIMIT_PERIOD_ADJECTIVE,
  LIMIT_PERIOD_LABEL,
  LIMIT_PERIODS,
  limitError,
  limitPricePerLiter,
  type LimitPeriod,
  requestLimitChange,
  UNLIMITED_LITERS,
} from "~/lib/fleet";
import { formatLei } from "~/lib/format";

/** Cele doua optiuni pe care le oferim din cele trei ale portalului - vezi nota de sub formular. */
type Mode = "valoare" | "nelimitat";

/**
 * Cererea de schimbare a unui plafon. Numai managerul ajunge aici - serviciul refuza oricum un
 * sofer, inaintea oricarei citiri.
 *
 * Doua lucruri fac formularul asta sa nu fie un simplu camp numeric:
 *
 * 1. **Unitatea.** Plafonul este in litri, dar ecranele arata peste tot si echivalentul in lei, iar
 *    cine gandeste in bani tasteaza 5000 si primeste 5000 de *litri* - de peste zece ori plafonul
 *    real al unei masini. Serverul are un prag de siguranta care prinde cifra, dar un refuz dupa
 *    trimitere este o plasa, nu o interfata: aici unitatea sta lipita de caseta, iar estimarea in
 *    lei se actualizeaza pe masura ce se tasteaza, deci confuzia se vede inainte de trimitere.
 * 2. **Zero nu este un camp gol.** "Fara plafon" este o stare adevarata in portal (*Nelimitat*),
 *    codificata chiar prin zero, deci se cere ca alegere explicita - nu stergand valoarea din
 *    caseta, unde ar arata ca o omisiune.
 *
 * *Alimentari blocate*, a treia optiune a portalului, **nu** este aici: bararea unei masini este o
 * alta operatie, cu alte urmari, si nu se cere tastand o valoare intr-o caseta de plafon.
 */
export function CarLimitForm({
  car,
  period,
  opened,
  onClose,
  onSaved,
}: {
  car: Car;
  /** Plafonul preselectat, cand formul se deschide de pe randul unuia dintre ele. */
  period?: LimitPeriod;
  opened: boolean;
  onClose: () => void;
  /** Ce s-a cerut, ca sectiunea sa poata urmari cererea si sa deduca raspunsul portalului. */
  onSaved?: (request: { period: LimitPeriod; liters: number }) => void;
}) {
  const [which, setWhich] = useState<LimitPeriod>(period ?? "lunara");
  const [mode, setMode] = useState<Mode>("valoare");
  const [liters, setLiters] = useState<number | "">("");
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (opened) {
      setWhich(period ?? "lunara");
      setMode("valoare");
      setLiters("");
      setTouched(false);
      setServerError(null);
    }
  }, [opened, period]);

  const asked = mode === "nelimitat" ? UNLIMITED_LITERS : liters === "" ? null : Number(liters);
  const error = limitError(car, which, asked);
  const current = carLimit(car, which);

  // Estimarea foloseste pretul pe care il trimite backendul; pe o masina fara plafon lunar el
  // lipseste, si atunci se cade pe pretul mediu al lunii curente - vezi `limitPricePerLiter`.
  const price = limitPricePerLiter(car);
  const estimate = price && asked != null && asked > 0 ? asked * price.price : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (error || asked == null) return;

    setBusy(true);
    try {
      await requestLimitChange({ carId: car.id, period: which, liters: asked });
      setServerError(null);
      onSaved?.({ period: which, liters: asked });
      onClose();
    } catch (err) {
      // Mesajele serverului sunt scrise in romana pentru utilizator: masina scoasa din flota, masina
      // fara partener, rol fara drept de scriere - refuzuri pe care frontendul nu le poate anticipa.
      setServerError(err instanceof Error ? err.message : "Cererea nu a putut fi trimisă.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Modifică plafonul" centered radius="lg">
      <form onSubmit={submit}>
        <Stack gap="sm">
          <Select
            label="Care plafon"
            data={LIMIT_PERIODS.map((p) => {
              const value = carLimit(car, p);
              return {
                value: p,
                label: `${LIMIT_PERIOD_LABEL[p]} · ${
                  value == null ? "necunoscut" : value === 0 ? "fără plafon" : formatLimitLiters(value)
                }`,
              };
            })}
            value={which}
            onChange={(v) => setWhich((v as LimitPeriod) ?? "lunara")}
            allowDeselect={false}
          />

          <SegmentedControl
            fullWidth
            value={mode}
            onChange={(v) => {
              setMode(v as Mode);
              setTouched(true);
            }}
            data={[
              { value: "valoare", label: "Limitare la" },
              { value: "nelimitat", label: "Fără plafon" },
            ]}
          />

          {mode === "valoare" ? (
            <NumberInput
              label={`Plafon ${LIMIT_PERIOD_ADJECTIVE[which]} nou`}
              // Unitatea de neratat: in eticheta, in caseta si in placeholder.
              description="Valoarea se dă în litri, nu în lei."
              suffix=" L"
              decimalSeparator=","
              thousandSeparator="."
              decimalScale={2}
              min={0}
              max={LIMIT_MAX_LITERS[which]}
              placeholder="ex. 1.000 L"
              value={liters}
              onChange={(v) => {
                setLiters(v === "" ? "" : Number(v));
                setTouched(true);
              }}
              data-autofocus
            />
          ) : (
            <Text size="sm" c="dimmed">
              Mașina va putea alimenta fără limită {LIMIT_PERIOD_ADJECTIVE[which]}. Este starea
              <i> Nelimitat</i> din portal, nu o valoare lipsă.
            </Text>
          )}

          {/* Estimarea sta langa cifra in litri, ca ordin de marime, niciodata in locul ei: la pompa
              se blocheaza litrii. Cu tot cu pretul din care iese, ca sa nu para o cifra cazuta din
              cer si ca sa se inteleaga de ce se schimba cand se schimba pretul carburantului. */}
          {mode === "valoare" && (
            <Text size="sm" c={estimate == null ? "dimmed" : undefined}>
              {estimate == null ? (
                asked == null || asked === 0 ? (
                  "Estimarea în lei apare pe măsură ce tastezi."
                ) : (
                  "Fără alimentări din care să iasă un preț, deci fără estimare în lei."
                )
              ) : (
                <>
                  ≈ <b>{formatLei(estimate)}</b> {LIMIT_PERIOD_ADJECTIVE[which]}, la{" "}
                  {price?.price.toFixed(2)} lei/L
                  {price?.source && ` · ${LEI_ESTIMATE_SOURCE_LABEL[price.source]}`}
                </>
              )}
            </Text>
          )}

          {touched && error && (
            <Alert color="red" variant="light" py="xs">
              {error}
            </Alert>
          )}
          {serverError && (
            <Alert color="red" variant="light" py="xs">
              {serverError}
            </Alert>
          )}

          {/* Cine trimite trebuie sa stie ca plafonul nu se schimba acum: la pompa opreste in
              continuare valoarea veche, pana cand portalul confirma. Altfel cere din nou. */}
          <Text size="xs" c="dimmed">
            Plafonul din portal rămâne{" "}
            {current == null
              ? "cel de acum"
              : current === 0
                ? "„fără plafon”"
                : formatLimitLiters(current)}{" "}
            până când cererea ajunge acolo și este confirmată — la pompă asta contează. Bararea unei
            mașini de la alimentare nu se cere de aici.
          </Text>

          <Button type="submit" fw={700} loading={busy} disabled={touched && error != null}>
            Trimite cererea
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
