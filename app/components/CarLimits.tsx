import { useState } from "react";
import { Alert, Badge, Button, Divider, Group, Loader, Paper, Progress, Stack, Text } from "@mantine/core";
import { Section } from "~/components/AppShell";
import { CarLimitForm } from "~/components/CarLimitForm";
import {
  type Car,
  carLimit,
  formatLimitLiters,
  isBlockingValue,
  LEI_ESTIMATE_SOURCE_LABEL,
  LIMIT_PERIOD_ADJECTIVE,
  LIMIT_PERIOD_LABEL,
  LIMIT_PERIODS,
  LIMIT_STATE_LABEL,
  type LimitPeriod,
  NEAR_LIMIT,
  usageRatio,
} from "~/lib/fleet";
import { formatLei, formatLiters } from "~/lib/format";
import { type LimitOutcome, useLimitWatch } from "~/lib/useLimitWatch";

/**
 * Plafoanele de carburant ale masinii: cele trei ale portalului, estimarea in lei a celui lunar si
 * cererea care asteapta raspuns.
 *
 * Bara de progres sta numai pe plafonul lunar: este singurul pentru care avem si consumul de
 * comparat, si este in aceeasi unitate cu el. Estimarea in lei sta **langa** cifra in litri, nu in
 * bara - la pompa se blocheaza litrii, deci un raport lei/plafon nu ar insemna nimic.
 */
export function CarLimits({
  car,
  canEdit,
  onRequested,
}: {
  car: Car;
  /** Scrisul este numai al managerului - serviciul refuza un sofer inaintea oricarei citiri. */
  canEdit: boolean;
  onRequested?: () => void;
}) {
  const [editPeriod, setEditPeriod] = useState<LimitPeriod | null>(null);
  const { watch, outcome, start, dismiss } = useLimitWatch(car.id, onRequested);

  return (
    <Section
      title="Plafoane de carburant"
      action={
        canEdit && (
          <Button size="compact-xs" variant="light" onClick={() => setEditPeriod("lunara")}>
            Modifică
          </Button>
        )
      }
    >
      <Stack gap="xs">
        {outcome && <Outcome outcome={outcome} onDismiss={dismiss} />}

        {LIMIT_PERIODS.map((period) => (
          <LimitRow
            key={period}
            car={car}
            period={period}
            onEdit={canEdit ? () => setEditPeriod(period) : undefined}
            watching={watch?.period === period}
          />
        ))}

        {/* Coloanele saptamanal si zilnic se umplu abia cand aplicatia atinge vehiculul in portal,
            deci azi "necunoscut" este raspunsul obisnuit si nu trebuie citit ca "fara plafon". */}
        <Text size="xs" c="dimmed" px={4}>
          Plafoanele sunt în litri și vin din portalul furnizorului, care le aplică la pompă. Cel
          săptămânal și cel zilnic se citesc de acolo prima dată când o cerere ajunge pe mașină.
        </Text>
      </Stack>

      <CarLimitForm
        car={car}
        period={editPeriod ?? undefined}
        opened={editPeriod !== null}
        onClose={() => setEditPeriod(null)}
        onSaved={(request) => {
          // Intai reincarcam, ca insigna "in asteptare" sa apara pe loc, apoi urmarim raspunsul.
          onRequested?.();
          start(request.period, request.liters);
        }}
      />
    </Section>
  );
}

/**
 * Patru stari, nu doua: o valoare, "fara plafon" (zero, adica *Nelimitat* in portal), "blocata la
 * alimentare" (sub un litru, unde portalul barează vehiculul in loc sa il limiteze) si
 * "necunoscut" - o coloana goala inseamna ca nu stim, nu ca nu exista plafon.
 */
function LimitRow({
  car,
  period,
  onEdit,
  watching,
}: {
  car: Car;
  period: LimitPeriod;
  onEdit?: () => void;
  /** Intrebam serverul chiar acum daca portalul a raspuns - vezi `useLimitWatch`. */
  watching?: boolean;
}) {
  const value = carLimit(car, period);
  const blocked = isBlockingValue(value);
  const unknown = value == null;
  const unlimited = value === 0;
  const pending = car.pendingLimitPeriod === period ? car.pendingLimitLiters : undefined;

  return (
    <Paper
      withBorder
      radius="lg"
      p="sm"
      style={{ borderColor: blocked ? "var(--mantine-color-red-3)" : undefined }}
    >
      <Group justify="space-between" wrap="nowrap" align="start">
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text size="10px" fw={700} tt="uppercase" c="gray.6" style={{ letterSpacing: "0.08em" }}>
            {LIMIT_PERIOD_LABEL[period]}
          </Text>
          <Text fw={700} c={blocked ? "red.7" : unknown ? "dimmed" : undefined}>
            {blocked
              ? "Blocată la alimentare"
              : unknown
                ? "Necunoscut"
                : unlimited
                  ? "Fără plafon"
                  : formatLimitLiters(value)}
          </Text>
          {blocked && (
            <Text size="xs" c="dimmed">
              Portalul barează vehiculul la {formatLimitLiters(value)}, nu îl limitează.
            </Text>
          )}
        </Stack>
        {onEdit && (
          <Button size="compact-xs" variant="subtle" onClick={onEdit}>
            Schimbă
          </Button>
        )}
      </Group>

      {period === "lunara" && <MonthlyExtras car={car} />}

      {pending != null && (
        <>
          <Divider my="xs" />
          <Group gap="xs" wrap="nowrap">
            <Badge
              color="orange"
              variant="light"
              size="sm"
              leftSection={watching ? <Loader size={10} color="orange" /> : undefined}
            >
              {car.pendingLimitState ? LIMIT_STATE_LABEL[car.pendingLimitState] : "În așteptare"}
            </Badge>
            <Text size="xs" c="dimmed">
              În curs de modificare la{" "}
              <b>{pending === 0 ? "„fără plafon”" : formatLimitLiters(pending)}</b>.{" "}
              {watching
                ? "Verificăm portalul; răspunsul apare aici, în câteva minute."
                : "Până la confirmare, la pompă contează valoarea de mai sus."}
            </Text>
          </Group>
        </>
      )}
    </Paper>
  );
}

/**
 * Raspunsul portalului - vezi `useLimitWatch`.
 *
 * Motivul refuzului vine de la server, scris de trimitere in romana pentru utilizator ("pagina
 * vehiculului 740501 arata mai departe 300,00"). Cand lipseste - fereastra de 24 de ore a trecut,
 * sau citirea a picat - se spune doar ca plafonul nu s-a schimbat si se trimite la back-office, in
 * loc sa se inventeze o cauza.
 */
function Outcome({ outcome, onDismiss }: { outcome: LimitOutcome; onDismiss: () => void }) {
  const what = LIMIT_PERIOD_ADJECTIVE[outcome.period];
  const value =
    outcome.liters === 0 ? "fără plafon" : formatLimitLiters(outcome.liters);

  if (outcome.timedOut) {
    return (
      <Alert color="gray" variant="light" radius="lg" withCloseButton onClose={onDismiss}>
        Cererea este încă în coadă. Se trimite automat — reîncarcă pagina peste câteva minute ca să
        vezi rezultatul.
      </Alert>
    );
  }

  return outcome.accepted ? (
    <Alert color="teal" variant="light" radius="lg" withCloseButton onClose={onDismiss}>
      Portalul a confirmat plafonul {what}: <b>{value}</b>. De acum asta oprește pompa.
    </Alert>
  ) : (
    <Alert
      color="red"
      variant="light"
      radius="lg"
      title="Portalul nu a aplicat plafonul"
      withCloseButton
      onClose={onDismiss}
    >
      {outcome.message ?? (
        <>
          Cererea de {value} ({what}) s-a închis fără ca plafonul să se schimbe. Motivul este scris
          în back-office, pe cererea respectivă.
        </>
      )}
    </Alert>
  );
}

/**
 * Ce se poate spune doar despre plafonul lunar: cat s-a consumat din el si cat ar costa in lei.
 *
 * Amandoua numai pe el: consumul lunii curente este singura cifra in aceeasi unitate, iar estimarea
 * in lei o calculeaza backendul tot pe plafonul lunar.
 */
function MonthlyExtras({ car }: { car: Car }) {
  const ratio = usageRatio(car);
  const estimate = car.limitEstimateLei;
  const used = car.usedLiters ?? 0;

  if (ratio == null && estimate?.value == null) return null;

  const pct = ratio == null ? 0 : Math.min(100, Math.round(ratio * 100));

  return (
    <Stack gap={4} mt="xs">
      {ratio != null && (
        <>
          <Group justify="space-between" gap="xs">
            <Text size="xs" c="dimmed">
              Consumat luna aceasta: {formatLiters(used)}
            </Text>
            <Text size="xs" fw={700}>
              {formatLei(car.usedLei ?? 0)}
            </Text>
          </Group>
          {/* Culori semantice, nu de brand - aceeasi regula ca in `CarCard`. */}
          <Progress
            value={pct}
            color={pct >= 100 ? "red" : pct >= NEAR_LIMIT * 100 ? "orange" : "teal"}
            radius="xl"
            size="sm"
          />
        </>
      )}
      {estimate?.value != null && (
        <Text size="xs" c="dimmed">
          ≈ {formatLei(estimate.value)} {LIMIT_PERIOD_ADJECTIVE.lunara}
          {estimate.pricePerLiter != null && `, la ${estimate.pricePerLiter.toFixed(2)} lei/L`}
          {estimate.source && ` · ${LEI_ESTIMATE_SOURCE_LABEL[estimate.source]}`}
        </Text>
      )}
    </Stack>
  );
}
