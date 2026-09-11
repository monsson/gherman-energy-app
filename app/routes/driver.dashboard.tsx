import { useState } from "react";
import { Badge, Button, Card, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { AppShell, Section } from "~/components/AppShell";
import { Async } from "~/components/Async";
import { CarCard } from "~/components/CarCard";
import { TransactionForm } from "~/components/TransactionForm";
import { capabilities, cheapStations, listCars, listDrivers, recent } from "~/lib/fleet";
import { formatDateTime, formatLei, formatLiters } from "~/lib/format";
import { useResource } from "~/lib/useResource";
import { useSession } from "./auth-layout";

export default function DriverDashboard() {
  const session = useSession();
  const [txOpen, setTxOpen] = useState(false);

  const cars = useResource(() => listCars(), []);
  const drivers = useResource(() => listDrivers(), []);
  const last3 = useResource(() => recent({ limit: 3 }), []);
  const cheap = useResource(() => cheapStations(undefined, 3), []);

  // In modul API numele vine din profil; in demo, din lista de soferi (care pentru un sofer il
  // intoarce doar pe el).
  const name = session.name ?? drivers.data?.[0]?.name ?? session.username;
  // Cardurile vin din profil in modul API; in demo, soferul isi are cardul pe el insusi.
  const cards =
    session.cards?.map((c) => c.nrCardMascat).filter((v): v is string => !!v) ??
    (drivers.data?.[0]?.cardMasked ? [drivers.data[0].cardMasked] : []);

  return (
    <AppShell session={session} title={`Bună, ${name.split(" ")[0]}`}>
      <Section title={cards.length > 1 ? "Cardurile mele" : "Cardul meu"}>
        <Stack gap="xs">
          {cards.length === 0 && (
            <Card withBorder radius="lg" padding="md">
              <Text size="sm" c="dimmed">
                Niciun card activ asociat contului.
              </Text>
            </Card>
          )}
          {cards.map((card) => (
            <Card
              key={card}
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
                    {name}
                  </Text>
                </Stack>
                <Text fz={28}>💳</Text>
              </Group>
              <Text ff="monospace" fz={20} fw={500} style={{ letterSpacing: "0.2em" }}>
                {card}
              </Text>
            </Card>
          ))}
        </Stack>
      </Section>

      {/* Plafonul este al masinii si este in litri: fiecare vehicul are bara lui. O cifra insumata
          pe sofer ar lasa impresia ca se poate alimenta pe o masina plafonul celeilalte. */}
      <Async resource={cars}>
        {(list) => (
          <Section title={list.length > 1 ? "Mașinile mele" : "Mașina mea"}>
            <Stack gap="xs">
              {list.length === 0 && (
                <Card withBorder radius="lg" padding="md">
                  <Text size="sm" c="dimmed">
                    Nicio mașină asignată contului tău.
                  </Text>
                </Card>
              )}
              {list.map((c) => (
                <CarCard key={c.id} car={c} showLimit />
              ))}
            </Stack>
          </Section>
        )}
      </Async>

      {capabilities().canAddTransaction && (
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
      )}

      <Section title="Ultimele 3 alimentări">
        <Async resource={last3}>
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
                        <Text size="sm" fw={600} truncate>
                          {t.stationName ?? "Stație necunoscută"}
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
                  ))}
                </Stack>
              )}
            </Card>
          )}
        </Async>
      </Section>

      <Section title="Top 3 prețuri">
        <Async resource={cheap}>
          {(list) =>
            list.length === 0 ? (
              // Nicio statie nu are pret completat: nomenclatorul nu il primeste din portal, se
              // introduce de mana in back-office.
              <Card withBorder radius="lg" padding="md">
                <Text size="sm" c="dimmed">
                  Prețurile stațiilor nu sunt încă disponibile.
                </Text>
              </Card>
            ) : (
              <Stack gap="xs">
                {list.map((s, i) => (
                  <Paper key={s.id} withBorder radius="lg" p="sm">
                    <Group wrap="nowrap" gap="sm">
                      <ThemeIcon
                        variant="filled"
                        color={["yellow.5", "gray.5", "orange.7"][i] ?? "gray"}
                        radius="xl"
                        size={36}
                      >
                        <Text fw={800} c="white">
                          {i + 1}
                        </Text>
                      </ThemeIcon>
                      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={700} truncate>
                          {s.name}
                        </Text>
                        {s.address && (
                          <Text size="xs" c="dimmed" truncate>
                            {s.address}
                          </Text>
                        )}
                      </Stack>
                      <Stack gap={4} align="end">
                        {s.petrolPrice != null && (
                          <Badge variant="filled" color="brand" size="md" radius="sm" c="dark.8">
                            Benzină {s.petrolPrice.toFixed(2)} lei
                          </Badge>
                        )}
                        {s.dieselPrice != null && (
                          <Badge variant="filled" color="orange" size="md" radius="sm">
                            Motorină {s.dieselPrice.toFixed(2)} lei
                          </Badge>
                        )}
                      </Stack>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )
          }
        </Async>
      </Section>

      <TransactionForm
        session={session}
        opened={txOpen}
        onClose={() => setTxOpen(false)}
        onAdded={() => {
          last3.reload();
          cars.reload();
        }}
      />
    </AppShell>
  );
}
