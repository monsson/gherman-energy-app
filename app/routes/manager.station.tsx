import { Link, useParams } from "react-router";
import {
  Anchor,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { AppShell, Section } from "~/components/AppShell";
import {
  cars,
  getStation,
  transactionsForStation,
} from "~/lib/data";
import { formatDateTime, formatLei } from "~/lib/format";
import { useSession } from "./auth-layout";

export default function ManagerStation() {
  const session = useSession();
  const { id } = useParams();
  const station = getStation(Number(id));

  if (!station) {
    return (
      <AppShell session={session} title="Stație" back="/manager">
        <Text ta="center" c="dimmed" py="xl">
          Stație inexistentă.
        </Text>
      </AppShell>
    );
  }

  const txs = transactionsForStation(station.id);
  const total = txs.reduce((s, t) => s + t.total, 0);
  const liters = txs.reduce((s, t) => s + t.liters, 0);

  return (
    <AppShell session={session} title={station.name} back="/manager">
      <Card withBorder radius="lg" padding="md" shadow="xs" mb="md">
        <Group wrap="nowrap" gap="sm" mb="md">
          <ThemeIcon variant="light" color="yellow" size={56} radius="md" style={{ fontSize: 28 }}>
            🏪
          </ThemeIcon>
          <Stack gap={0} style={{ flex: 1 }}>
            <Title order={4}>{station.name}</Title>
            <Text size="sm" c="dimmed">
              {station.address}
            </Text>
          </Stack>
        </Group>

        <SimpleGrid cols={2} spacing="sm">
          <Tile label="Benzină" value={`${station.petrolPrice.toFixed(2)} lei/L`} />
          <Tile label="Motorină" value={`${station.dieselPrice.toFixed(2)} lei/L`} />
          <Tile label="Total alimentări" value={formatLei(total)} bg="dark.8" fg="white" sub="brand.3" />
          <Tile label="Total litri" value={`${Math.round(liters)} L`} bg="dark.7" fg="white" sub="gray.5" />
        </SimpleGrid>
      </Card>

      <Section title={`Tranzacții la ${station.name} (${txs.length})`}>
        <Card withBorder padding={0} radius="lg" shadow="xs">
          <Stack gap={0}>
            {txs.map((t, i, arr) => {
              const car = cars.find((c) => c.id === t.carId)!;
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
                      <Text size="sm" fw={600}>
                        {car.plate}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatDateTime(t.date)} · {t.liters.toFixed(1)} L · {t.fuel}
                      </Text>
                    </Stack>
                    <Text size="sm" fw={700}>
                      {formatLei(t.total)}
                    </Text>
                  </Group>
                </Anchor>
              );
            })}
          </Stack>
        </Card>
      </Section>
    </AppShell>
  );
}

function Tile({
  label,
  value,
  bg,
  fg,
  sub,
}: {
  label: string;
  value: string;
  bg?: string;
  fg?: string;
  sub?: string;
}) {
  return (
    <Stack
      gap={2}
      p="sm"
      bg={bg ?? "gray.0"}
      c={fg}
      style={{ borderRadius: 12 }}
    >
      <Text size="10px" fw={700} tt="uppercase" c={sub ?? "gray.6"} style={{ letterSpacing: "0.08em" }}>
        {label}
      </Text>
      <Text fz={18} fw={800}>
        {value}
      </Text>
    </Stack>
  );
}
