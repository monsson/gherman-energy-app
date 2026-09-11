import { useState } from "react";
import { Link } from "react-router";
import {
  Alert,
  Anchor,
  Box,
  Button,
  Card,
  Chip,
  Group,
  Select,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { AppShell } from "~/components/AppShell";
import { Async } from "~/components/Async";
import { TransactionForm } from "~/components/TransactionForm";
import {
  capabilities,
  daysAgo,
  FUEL_LABEL,
  listCars,
  listDrivers,
  listTransactions,
} from "~/lib/fleet";
import { formatDateTime, formatLei, formatLiters } from "~/lib/format";
import { useResource } from "~/lib/useResource";
import { useSession } from "./auth-layout";

const PERIODS = [
  { value: "30", label: "30 zile" },
  { value: "90", label: "3 luni" },
  { value: "365", label: "12 luni" },
];

/** Acelasi plafon ca pe server; cand raspunsul il atinge, lista este taiata, nu completa. */
const MAX_ROWS = 1000;

export default function ManagerTransactions() {
  const session = useSession();
  const [days, setDays] = useState("30");
  const [carId, setCarId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [txOpen, setTxOpen] = useState(false);

  const cars = useResource(() => listCars(), []);
  const drivers = useResource(() => listDrivers(), []);
  const txs = useResource(
    () =>
      listTransactions({
        from: daysAgo(Number(days)),
        carId: carId ?? undefined,
        driverId: driverId ?? undefined,
      }),
    [days, carId, driverId],
  );

  return (
    <AppShell session={session} title="Alimentări" back="/manager">
      {/* Prima etapa a API-ului acopera doar Rompetrol, deci lista nu este "toate alimentarile". */}
      <Text size="xs" c="dimmed" mb="sm">
        Alimentări Rompetrol (Fill&amp;Go). Alți furnizori se adaugă ulterior.
      </Text>

      {capabilities().canAddTransaction && (
        <Button
          size="md"
          fullWidth
          fw={700}
          mb="md"
          leftSection={<span aria-hidden>⛽</span>}
          onClick={() => setTxOpen(true)}
        >
          Alimentare nouă
        </Button>
      )}

      <Chip.Group multiple={false} value={days} onChange={(v) => setDays(v as string)}>
        <Group gap="xs" wrap="nowrap" mb="sm" style={{ overflowX: "auto" }}>
          {PERIODS.map((p) => (
            <Chip key={p.value} value={p.value} radius="xl">
              {p.label}
            </Chip>
          ))}
        </Group>
      </Chip.Group>

      <Group grow mb="md">
        <Select
          placeholder="Toate mașinile"
          data={(cars.data ?? []).map((c) => ({ value: c.id, label: c.plate }))}
          value={carId}
          onChange={setCarId}
          searchable
          clearable
          size="xs"
        />
        <Select
          placeholder="Toți șoferii"
          data={(drivers.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
          value={driverId}
          onChange={setDriverId}
          searchable
          clearable
          size="xs"
        />
      </Group>

      <Async resource={txs}>
        {(list) => {
          const groups = new Map<string, typeof list>();
          for (const t of list) {
            const day = t.date
              ? new Date(t.date).toLocaleDateString("ro-RO", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : "Fără dată";
            const grup = groups.get(day);
            if (grup) grup.push(t);
            else groups.set(day, [t]);
          }

          return (
            <Stack gap="md">
              {list.length >= MAX_ROWS && (
                <Alert color="yellow" variant="light" radius="lg">
                  <Text size="sm">
                    Se afișează primele {MAX_ROWS} alimentări din perioadă, cele mai recente.
                    Restrânge perioada sau filtrează ca să le vezi pe toate.
                  </Text>
                </Alert>
              )}

              {list.length === 0 && (
                <Text ta="center" c="dimmed" py="xl" size="sm">
                  Nicio alimentare în perioada aleasă.
                </Text>
              )}

              {[...groups.entries()].map(([day, items]) => {
                const dayTotal = items.reduce((s, t) => s + (t.total ?? 0), 0);
                return (
                  <Box key={day}>
                    <Group justify="space-between" px={4} mb={6}>
                      <Text size="xs" fw={700} tt="uppercase" c="gray.6" style={{ letterSpacing: "0.08em" }}>
                        {day}
                      </Text>
                      <Text size="xs" fw={700}>
                        {formatLei(dayTotal)}
                      </Text>
                    </Group>
                    <Card withBorder padding={0} radius="lg" shadow="xs">
                      <Stack gap={0}>
                        {items.map((t, i, arr) => {
                          const borderBottom =
                            i === arr.length - 1
                              ? "none"
                              : "1px solid var(--mantine-color-default-border)";
                          const row = (
                            <Group wrap="nowrap" gap="sm" p="sm">
                              <ThemeIcon variant="light" color="brand" size={40} radius="md">
                                ⛽
                              </ThemeIcon>
                              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                                <Text size="sm" fw={600} ff="monospace" truncate>
                                  {t.plate ?? "—"}
                                </Text>
                                <Text size="xs" c="dimmed" truncate>
                                  {t.stationName ?? "Stație necunoscută"}
                                  {t.fuel && ` · ${FUEL_LABEL[t.fuel]}`}
                                  {t.liters != null && ` · ${formatLiters(t.liters)}`}
                                </Text>
                                <Text size="10px" c="gray.5">
                                  {t.date ? formatDateTime(t.date) : "—"}
                                </Text>
                              </Stack>
                              <Stack gap={0} align="end">
                                <Text size="sm" fw={700}>
                                  {formatLei(t.total ?? 0)}
                                </Text>
                                {t.pricePerLiter != null && (
                                  <Text size="11px" c="dimmed">
                                    {t.pricePerLiter.toFixed(2)} lei/L
                                  </Text>
                                )}
                              </Stack>
                            </Group>
                          );
                          return t.carId ? (
                            <Anchor
                              key={t.id}
                              component={Link}
                              to={`/car/${t.carId}`}
                              underline="never"
                              c="inherit"
                              style={{ borderBottom }}
                            >
                              {row}
                            </Anchor>
                          ) : (
                            <div key={t.id} style={{ borderBottom }}>
                              {row}
                            </div>
                          );
                        })}
                      </Stack>
                    </Card>
                  </Box>
                );
              })}
            </Stack>
          );
        }}
      </Async>

      <TransactionForm
        session={session}
        opened={txOpen}
        onClose={() => setTxOpen(false)}
        onAdded={txs.reload}
      />
    </AppShell>
  );
}
