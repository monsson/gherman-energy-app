import { useState } from "react";
import { Navigate } from "react-router";
import {
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { AppShell, Section } from "~/components/AppShell";
import { CarCard } from "~/components/CarCard";
import { TransactionForm } from "~/components/TransactionForm";
import {
  cars,
  getDriver,
  stations,
  topCheapStations,
  transactionsForDriver,
  useData,
} from "~/lib/data";
import { formatDateTime, formatLei } from "~/lib/format";
import { useSession } from "./auth-layout";

export default function DriverDashboard() {
  const session = useSession();
  useData(); // re-render when a fuel-up is added
  const [txOpen, setTxOpen] = useState(false);
  if (!session.driverId) return <Navigate to="/" replace />;

  const driver = getDriver(session.driverId);
  if (!driver) return <Navigate to="/" replace />;

  const driverCar = cars.find((c) => c.driverId === driver.id);
  const last3 = transactionsForDriver(driver.id).slice(0, 3);
  const top3 = topCheapStations();
  const limitPct = Math.min(100, Math.round((driver.used / driver.limit) * 100));
  const medalColor = ["yellow.5", "gray.5", "orange.7"];

  return (
    <AppShell session={session} title={`Bună, ${driver.name.split(" ")[0]}`}>
      <Section title="Cardul meu">
        <Card
          radius="lg"
          padding="md"
          c="white"
          style={{
            background:
              "linear-gradient(135deg, var(--mantine-color-dark-9), var(--mantine-color-dark-8) 55%, var(--mantine-color-brand-7))",
          }}
        >
          <Group justify="space-between" mb="lg">
            <Stack gap={0}>
              <Text size="10px" fw={700} tt="uppercase" c="brand.2" style={{ letterSpacing: "0.16em" }}>
                GE Fleet Card
              </Text>
              <Text fw={700} size="lg">
                {driver.name}
              </Text>
            </Stack>
            <Text fz={28}>💳</Text>
          </Group>
          <Text ff="monospace" fz={20} fw={500} style={{ letterSpacing: "0.2em" }}>
            •••• •••• •••• {driver.cardNumber}
          </Text>
          <Stack gap={4} mt="md">
            <Group justify="space-between">
              <Text size="xs" fw={700} c="brand.2">
                Limită lunară
              </Text>
              <Text size="xs" fw={700} c="brand.2">
                {formatLei(driver.used)} / {formatLei(driver.limit)}
              </Text>
            </Group>
            <Progress value={limitPct} color="brand.4" radius="xl" size="sm" bg="rgba(255,255,255,0.2)" />
          </Stack>
        </Card>
      </Section>

      {driverCar && (
        <Section title="Mașina mea">
          <CarCard car={driverCar} />
        </Section>
      )}

      <Button
        size="md"
        fullWidth
        fw={700}
        mb="lg"
        leftSection={<span aria-hidden>⛽</span>}
        onClick={() => setTxOpen(true)}
      >
        Alimentare nouă
      </Button>

      <Section title="Ultimele 3 alimentări">
        <Card withBorder padding={0} radius="lg" shadow="xs">
          {last3.length === 0 ? (
            <Text p="md" size="sm" c="dimmed">
              Nicio alimentare încă.
            </Text>
          ) : (
            <Stack gap={0}>
              {last3.map((t, i, arr) => {
                const station = stations.find((s) => s.id === t.stationId)!;
                return (
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
                      <Text size="sm" fw={600} truncate>
                        {station.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatDateTime(t.date)} · {t.liters.toFixed(1)} L
                      </Text>
                    </Stack>
                    <Text size="sm" fw={700}>
                      {formatLei(t.total)}
                    </Text>
                  </Group>
                );
              })}
            </Stack>
          )}
        </Card>
      </Section>

      <Section title="Top 3 prețuri în județ">
        <Stack gap="xs">
          {top3.map((s, i) => (
            <Paper key={s.id} withBorder radius="lg" p="sm">
              <Group wrap="nowrap" gap="sm">
                <ThemeIcon variant="filled" color={medalColor[i] ?? "gray"} radius="xl" size={36}>
                  <Text fw={800} c="white">
                    {i + 1}
                  </Text>
                </ThemeIcon>
                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={700} truncate>
                    {s.name}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {s.address}
                  </Text>
                </Stack>
                <Stack gap={4} align="end">
                  <Badge variant="filled" color="brand" size="md" radius="sm" c="dark.8">
                    Benzină {s.petrolPrice.toFixed(2)} lei
                  </Badge>
                  <Badge variant="filled" color="orange" size="md" radius="sm">
                    Motorină {s.dieselPrice.toFixed(2)} lei
                  </Badge>
                </Stack>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Section>

      <TransactionForm
        session={session}
        opened={txOpen}
        onClose={() => setTxOpen(false)}
      />
    </AppShell>
  );
}
