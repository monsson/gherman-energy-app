import { Link } from "react-router";
import {
  Anchor,
  Box,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { AppShell } from "~/components/AppShell";
import { cars, stations, transactions } from "~/lib/data";
import { formatDateTime, formatLei } from "~/lib/format";
import { useSession } from "./auth-layout";

export default function ManagerTransactions() {
  const session = useSession();

  const groups = new Map<string, typeof transactions>();
  for (const t of transactions) {
    const day = new Date(t.date).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(t);
  }

  return (
    <AppShell session={session} title="Tranzacții" back="/manager">
      <Stack gap="md">
        {[...groups.entries()].map(([day, items]) => {
          const dayTotal = items.reduce((s, t) => s + t.total, 0);
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
                    const car = cars.find((c) => c.id === t.carId)!;
                    const station = stations.find((s) => s.id === t.stationId)!;
                    return (
                      <Anchor
                        key={t.id}
                        component={Link}
                        to={`/car/${car.id}`}
                        underline="never"
                        c="inherit"
                        style={{
                          borderBottom:
                            i === arr.length - 1
                              ? "none"
                              : "1px solid var(--mantine-color-gray-1)",
                        }}
                      >
                        <Group wrap="nowrap" gap="sm" p="sm">
                          <ThemeIcon variant="light" color="brand" size={40} radius="md">
                            ⛽
                          </ThemeIcon>
                          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" fw={600} truncate>
                              {car.plate} · {car.brand} {car.model}
                            </Text>
                            <Text size="xs" c="dimmed" truncate>
                              {station.name} · {t.fuel} · {t.liters.toFixed(1)} L
                            </Text>
                            <Text size="10px" c="gray.5">
                              {formatDateTime(t.date)}
                            </Text>
                          </Stack>
                          <Stack gap={0} align="end">
                            <Text size="sm" fw={700}>
                              {formatLei(t.total)}
                            </Text>
                            <Text size="11px" c="dimmed">
                              {t.pricePerLiter.toFixed(2)} lei/L
                            </Text>
                          </Stack>
                        </Group>
                      </Anchor>
                    );
                  })}
                </Stack>
              </Card>
            </Box>
          );
        })}
      </Stack>
    </AppShell>
  );
}
