import { Link } from "react-router";
import {
  Alert,
  Anchor,
  Badge,
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
import { CarCard } from "~/components/CarCard";
import { useSession } from "./auth-layout";
import {
  cars,
  carHasExpiredDoc,
  monthlyAggregate,
  stations,
  transactions,
} from "~/lib/data";
import { formatLei } from "~/lib/format";

export default function ManagerDashboard() {
  const session = useSession();
  const monthly = monthlyAggregate(transactions);

  const totalSpend = transactions.reduce((s, t) => s + t.total, 0);
  const totalLiters = transactions.reduce((s, t) => s + t.liters, 0);
  const totalKm = transactions.reduce((s, t) => s + t.kmDriven, 0);
  const avgConsumption = totalKm > 0 ? Math.round((totalLiters / totalKm) * 1000) / 10 : 0;

  const expiringCars = cars.filter(carHasExpiredDoc);

  return (
    <AppShell session={session} title="Salut, Fleet Manager">
      <Section title="Sumar 6 luni">
        <SimpleGrid cols={2} spacing="sm">
          <Stat label="Total cheltuit" value={formatLei(totalSpend)} accent />
          <Stat label="Total litri" value={`${Math.round(totalLiters)} L`} />
          <Stat label="Distanță" value={`${totalKm.toLocaleString("ro-RO")} km`} />
          <Stat label="Consum mediu" value={`${avgConsumption} L/100km`} />
        </SimpleGrid>
      </Section>

      <Section title="Consum mediu (L/100km)">
        <Card withBorder radius="lg" padding="md" shadow="xs">
          <BarChart
            h={180}
            data={monthly.map((m) => ({ month: m.label, value: m.consumption }))}
            dataKey="month"
            series={[{ name: "value", label: "L/100km", color: "brand.6" }]}
            withYAxis={false}
            valueFormatter={(v) => `${v} L`}
            withBarValueLabel
            valueLabelProps={{ position: 'inside', fill: 'white', fontSize: 18, fontWeight: 700 }}
            barProps={{ radius: 6 }}
          />
        </Card>
      </Section>

      <Section title="Kilometri parcurși">
        <Card withBorder radius="lg" padding="md" shadow="xs">
          <LineChart
            h={180}
            data={monthly.map((m) => ({ month: m.label, value: m.km }))}
            dataKey="month"
            series={[{ name: "value", label: "km", color: "yellow.6" }]}
            withDots
            curveType="monotone"
            valueFormatter={(v) => `${v.toLocaleString("ro-RO")} km`}
          />
        </Card>
      </Section>

      <Section
        title={`Mașini (${cars.length})`}
        action={
          <Anchor component={Link} to="/manager/cars" size="sm" fw={600}>
            Vezi toate →
          </Anchor>
        }
      >
        {expiringCars.length > 0 && (
          <Alert color="red" variant="light" mb="sm" radius="lg">
            <Text size="sm">
              <Text span fw={700}>
                {expiringCars.length}
              </Text>{" "}
              mașini au documente expirate.
            </Text>
          </Alert>
        )}
        <Stack gap="xs">
          {cars.slice(0, 3).map((c) => (
            <CarCard key={c.id} car={c} to={`/car/${c.id}`} />
          ))}
        </Stack>
      </Section>

      <Section
        title="Tranzacții recente"
        action={
          <Anchor component={Link} to="/manager/transactions" size="sm" fw={600}>
            Vezi toate →
          </Anchor>
        }
      >
        <Card withBorder padding={0} radius="lg" shadow="xs">
          <Stack gap={0}>
            {transactions.slice(0, 5).map((t, i, arr) => {
              const station = stations.find((s) => s.id === t.stationId)!;
              const car = cars.find((c) => c.id === t.carId)!;
              return (
                <Group
                  key={t.id}
                  wrap="nowrap"
                  gap="sm"
                  p="sm"
                  style={{
                    borderBottom:
                      i === arr.length - 1 ? "none" : "1px solid var(--mantine-color-gray-1)",
                  }}
                >
                  <ThemeIcon variant="light" color="brand" size={40} radius="md">
                    ⛽
                  </ThemeIcon>
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>
                      {car.plate} · {station.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(t.date).toLocaleDateString("ro-RO")} · {t.liters.toFixed(1)} L
                    </Text>
                  </Stack>
                  <Text size="sm" fw={700}>
                    {formatLei(t.total)}
                  </Text>
                </Group>
              );
            })}
          </Stack>
        </Card>
      </Section>

      <Section title="Stații">
        <Card withBorder padding={0} radius="lg" shadow="xs">
          <Stack gap={0}>
            {stations.map((s, i) => {
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`;
              return (
                <Group
                  key={s.id}
                  wrap="nowrap"
                  gap="sm"
                  p="sm"
                  style={{
                    borderBottom:
                      i === stations.length - 1
                        ? "none"
                        : "1px solid var(--mantine-color-gray-1)",
                  }}
                >
                  <Anchor
                    component={Link}
                    to={`/manager/station/${s.id}`}
                    underline="never"
                    c="inherit"
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <Group wrap="nowrap" gap="sm">
                      <ThemeIcon variant="light" color="yellow" size={40} radius="md">
                        🏪
                      </ThemeIcon>
                      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={600} truncate>
                          {s.name}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {s.address}
                        </Text>
                      </Stack>
                    </Group>
                  </Anchor>
                  <Stack gap={4} align="end">
                    <Badge
                      component="a"
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="filled"
                      color="brand"
                      size="md"
                      radius="sm"
                      c="dark.8"
                      style={{ cursor: "pointer" }}
                    >
                      Benzină {s.petrolPrice.toFixed(2)} lei
                    </Badge>
                    <Badge
                      component="a"
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="filled"
                      color="orange"
                      size="md"
                      radius="sm"
                      style={{ cursor: "pointer" }}
                    >
                      Motorină {s.dieselPrice.toFixed(2)} lei
                    </Badge>
                  </Stack>
                </Group>
              );
            })}
          </Stack>
        </Card>
      </Section>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
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
