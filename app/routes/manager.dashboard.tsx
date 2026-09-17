import { Link } from "react-router";
import {
  Alert,
  Anchor,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { BarChart, LineChart } from "@mantine/charts";
import { AppShell, Section } from "~/components/AppShell";
import { Async } from "~/components/Async";
import { SupplierBadge } from "~/components/SupplierBadge";
import { CarCard } from "~/components/CarCard";
import { carHasExpiredDoc, listCars, listStations, monthlySummary, recent } from "~/lib/fleet";
import { formatLei, formatLiters, formatMonth } from "~/lib/format";
import { useResource } from "~/lib/useResource";
import { useSession } from "./auth-layout";

export default function ManagerDashboard() {
  const session = useSession();
  // Totalurile si graficele vin din sumarul lunar, nu din lista de alimentari: lista are plafon de
  // randuri, deci sumele calculate din ea ar fi trunchiate, iar distanta se calculeaza pe lantul
  // de kilometraj al intervalului intreg.
  const summary = useResource(() => monthlySummary(), []);
  const cars = useResource(() => listCars(), []);
  const txs = useResource(() => recent({ limit: 5 }), []);
  const stations = useResource(() => listStations(), []);

  return (
    <AppShell session={session} title={`Salut, ${session.name ?? "Fleet Manager"}`}>
      <Async resource={summary}>
        {(months) => {
          const liters = months.reduce((s, m) => s + m.liters, 0);
          const km = months.reduce((s, m) => s + m.km, 0);
          const total = months.reduce((s, m) => s + m.total, 0);

          return (
            <>
              <Section title="Sumar 6 luni">
                <SimpleGrid cols={2} spacing="sm">
                  <Stat label="Total cheltuit" value={formatLei(total)} accent />
                  <Stat label="Total litri" value={formatLiters(liters)} />
                  <Stat label="Distanță" value={`${km.toLocaleString("ro-RO")} km`} />
                  <Stat
                    label="Consum mediu"
                    value={km > 0 ? `${Math.round((liters / km) * 1000) / 10} L/100km` : "—"}
                  />
                </SimpleGrid>
              </Section>

              <Section title="Consum mediu (L/100km)">
                <Card withBorder radius="lg" padding="md" shadow="xs">
                  {/* `consumption` null lasa coloana goala: o luna fara kilometraj raportat nu are
                      un consum de zero, ci unul necunoscut. */}
                  <BarChart
                    h={180}
                    data={months.map((m) => ({ month: formatMonth(m.month), value: m.consumption }))}
                    dataKey="month"
                    series={[{ name: "value", label: "L/100km", color: "brand.6" }]}
                    withYAxis={false}
                    valueFormatter={(v) => `${v} L`}
                    withBarValueLabel
                    valueLabelProps={{ position: "inside", fill: "white", fontSize: 18, fontWeight: 700 }}
                    barProps={{ radius: 6 }}
                  />
                </Card>
              </Section>

              <Section title="Kilometri parcurși">
                <Card withBorder radius="lg" padding="md" shadow="xs">
                  <LineChart
                    h={180}
                    data={months.map((m) => ({ month: formatMonth(m.month), value: m.km }))}
                    dataKey="month"
                    series={[{ name: "value", label: "km", color: "yellow.6" }]}
                    withDots
                    curveType="monotone"
                    valueFormatter={(v) => `${v.toLocaleString("ro-RO")} km`}
                  />
                </Card>
              </Section>
            </>
          );
        }}
      </Async>

      <Async resource={cars}>
        {(list) => {
          const expiring = list.filter(carHasExpiredDoc);
          return (
            <Section
              title={`Mașini (${session.totalCars ?? list.length})`}
              action={
                <Anchor component={Link} to="/manager/cars" size="sm" fw={600}>
                  Vezi toate →
                </Anchor>
              }
            >
              {expiring.length > 0 && (
                <Alert color="red" variant="light" mb="sm" radius="lg">
                  <Text size="sm">
                    <Text span fw={700}>
                      {expiring.length}
                    </Text>{" "}
                    {expiring.length === 1 ? "mașină are documente expirate" : "mașini au documente expirate"}.
                  </Text>
                </Alert>
              )}
              <Stack gap="xs">
                {list.slice(0, 3).map((c) => (
                  <CarCard key={c.id} car={c} />
                ))}
                {list.length === 0 && (
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    Nicio mașină vizibilă.
                  </Text>
                )}
              </Stack>
            </Section>
          );
        }}
      </Async>

      <Section
        title="Alimentări recente"
        action={
          <Anchor component={Link} to="/manager/transactions" size="sm" fw={600}>
            Vezi toate →
          </Anchor>
        }
      >
        <Async resource={txs}>
          {(list) => (
            <Card withBorder padding={0} radius="lg" shadow="xs">
              {list.length === 0 ? (
                <Text p="md" size="sm" c="dimmed">
                  Nicio alimentare în ultimul an.
                </Text>
              ) : (
                <Stack gap={0}>
                  {list.map((t, i, arr) => (
                    <Group
                      key={t.id}
                      wrap="nowrap"
                      gap="sm"
                      p="sm"
                      style={{
                        borderBottom:
                          i === arr.length - 1
                            ? "none"
                            : "1px solid var(--mantine-color-default-border)",
                      }}
                    >
                      <ThemeIcon variant="light" color="brand" size={40} radius="md">
                        ⛽
                      </ThemeIcon>
                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Group gap={6} wrap="nowrap">
                          <Text size="sm" fw={600} truncate>
                            {t.plate ?? "—"} · {t.stationName ?? "Stație necunoscută"}
                          </Text>
                          <SupplierBadge supplier={t.supplier} />
                        </Group>
                        <Text size="xs" c="dimmed">
                          {t.date ? new Date(t.date).toLocaleDateString("ro-RO") : "—"}
                          {t.liters != null && ` · ${formatLiters(t.liters)}`}
                        </Text>
                      </Stack>
                      <Text size="sm" fw={700}>
                        {formatLei(t.total ?? 0)}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              )}
            </Card>
          )}
        </Async>
      </Section>

      <Section
        title="Stații"
        action={
          <Anchor component={Link} to="/manager/stations" size="sm" fw={600}>
            Vezi toate →
          </Anchor>
        }
      >
        {/* Nomenclatorul real are 200 de statii: pe dashboard sta numarul, lista are pagina ei. */}
        <Card
          component={Link}
          to="/manager/stations"
          withBorder
          radius="lg"
          padding="md"
          shadow="xs"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <Group wrap="nowrap" gap="sm">
            <ThemeIcon variant="light" color="yellow" size={40} radius="md">
              🏪
            </ThemeIcon>
            <Stack gap={0} style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                {stations.data ? `${stations.data.length} stații` : "Stații"}
              </Text>
              <Text size="xs" c="dimmed">
                Prețuri și alimentările flotei, pe stație
              </Text>
            </Stack>
            <Text c="gray.4" fz={20} fw={700}>
              ›
            </Text>
          </Group>
        </Card>
      </Section>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Paper
      radius="lg"
      p="sm"
      withBorder={!accent}
      bg={accent ? "dark.8" : undefined}
      c={accent ? "white" : undefined}
    >
      <Text
        size="10px"
        fw={700}
        tt="uppercase"
        c={accent ? "brand.3" : "gray.6"}
        style={{ letterSpacing: "0.08em" }}
      >
        {label}
      </Text>
      <Text fz={20} fw={800} mt={2}>
        {value}
      </Text>
    </Paper>
  );
}
