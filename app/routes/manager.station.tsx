import { Link, useParams } from "react-router";
import {
  Anchor,
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { AppShell, Section } from "~/components/AppShell";
import { Async } from "~/components/Async";
import { daysAgo, getStation, listTransactions } from "~/lib/fleet";
import { formatDate, formatDateTime, formatLei, formatLiters } from "~/lib/format";
import { useResource } from "~/lib/useResource";
import { useSession } from "./auth-layout";

export default function ManagerStation() {
  const session = useSession();
  const { id = "" } = useParams();
  const station = useResource(() => getStation(id), [id]);
  const txs = useResource(() => listTransactions({ stationId: id, from: daysAgo(365) }), [id]);

  return (
    <AppShell session={session} title={station.data?.name ?? "Stație"} back="/manager/stations">
      <Async resource={station}>
        {(s) => {
          const mapsUrl = s.address
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`
            : null;

          return (
            <>
              <Card withBorder radius="lg" padding="md" shadow="xs" mb="md">
                <Group wrap="nowrap" gap="sm" mb="md">
                  <ThemeIcon variant="light" color="yellow" size={56} radius="md" style={{ fontSize: 28 }}>
                    🏪
                  </ThemeIcon>
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Title order={4}>{s.name}</Title>
                    {/* Adresele nu vin din portal; linkul catre harta apare doar cand exista una. */}
                    {mapsUrl ? (
                      <Anchor href={mapsUrl} target="_blank" rel="noopener noreferrer" size="sm">
                        {s.address}
                      </Anchor>
                    ) : (
                      <Text size="sm" c="dimmed">
                        Adresă necompletată
                      </Text>
                    )}
                  </Stack>
                </Group>

                <SimpleGrid cols={2} spacing="sm">
                  <Tile
                    label="Benzină"
                    value={s.petrolPrice != null ? `${s.petrolPrice.toFixed(2)} lei/L` : "—"}
                  />
                  <Tile
                    label="Motorină"
                    value={s.dieselPrice != null ? `${s.dieselPrice.toFixed(2)} lei/L` : "—"}
                  />
                </SimpleGrid>

                {s.priceUpdatedAt ? (
                  <Text size="xs" c="dimmed" mt="xs">
                    Prețuri actualizate la {formatDate(s.priceUpdatedAt)}
                  </Text>
                ) : (
                  <Badge variant="light" color="gray" mt="xs">
                    Fără prețuri înregistrate
                  </Badge>
                )}
              </Card>

              <Async resource={txs}>
                {(list) => {
                  const total = list.reduce((acc, t) => acc + (t.total ?? 0), 0);
                  const liters = list.reduce((acc, t) => acc + (t.liters ?? 0), 0);
                  return (
                    <>
                      <SimpleGrid cols={2} spacing="sm" mb="md">
                        <Tile label="Total alimentări" value={formatLei(total)} bg="dark.8" fg="white" sub="brand.3" />
                        <Tile label="Total litri" value={formatLiters(liters)} bg="dark.7" fg="white" sub="gray.5" />
                      </SimpleGrid>

                      <Section title={`Alimentări, ultimul an (${list.length})`}>
                        <Card withBorder padding={0} radius="lg" shadow="xs">
                          {list.length === 0 ? (
                            <Text p="md" size="sm" c="dimmed">
                              Nicio alimentare a flotei tale la această stație în ultimul an.
                            </Text>
                          ) : (
                            <Stack gap={0}>
                              {list.map((t, i, arr) => {
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
                                      <Text size="sm" fw={600} ff="monospace">
                                        {t.plate ?? "—"}
                                      </Text>
                                      <Text size="xs" c="dimmed">
                                        {t.date ? formatDateTime(t.date) : "—"}
                                        {t.liters != null && ` · ${formatLiters(t.liters)}`}
                                      </Text>
                                    </Stack>
                                    <Text size="sm" fw={700}>
                                      {formatLei(t.total ?? 0)}
                                    </Text>
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
                          )}
                        </Card>
                      </Section>
                    </>
                  );
                }}
              </Async>
            </>
          );
        }}
      </Async>
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
      bg={bg}
      c={fg}
      style={{
        borderRadius: 12,
        background: bg
          ? undefined
          : "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))",
      }}
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
