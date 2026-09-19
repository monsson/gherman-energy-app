import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  Anchor,
  Button,
  Card,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { BarChart } from "@mantine/charts";
import { AppShell, Section } from "~/components/AppShell";
import { Async } from "~/components/Async";
import { SupplierBadge } from "~/components/SupplierBadge";
import { CarDocuments } from "~/components/CarDocuments";
import { CarForm } from "~/components/CarForm";
import { CarLimits } from "~/components/CarLimits";
import {
  type CarDetail,
  daysAgo,
  FUEL_LABEL,
  getCar,
  listTransactions,
  monthlySummary,
  SEGMENT_LABEL,
} from "~/lib/fleet";
import { formatDateTime, formatLei, formatLiters, formatMonth } from "~/lib/format";
import { useResource } from "~/lib/useResource";
import { useSession } from "./auth-layout";

export default function CarDetailRoute() {
  const session = useSession();
  const { id = "" } = useParams();
  const [editOpen, setEditOpen] = useState(false);
  const back = session.role === "manager" ? "/manager/cars" : "/driver";

  const car = useResource(() => getCar(id), [id]);
  const summary = useResource(() => monthlySummary(id), [id]);
  const txs = useResource(() => listTransactions({ carId: id, from: daysAgo(365) }), [id]);

  return (
    <AppShell session={session} title={car.data?.plate ?? "Mașină"} back={back}>
      <Async resource={car}>
        {(data) => (
          <>
            <Header car={data} />

            {session.role === "manager" && (
              <Button
                variant="light"
                size="md"
                fullWidth
                mb="md"
                leftSection={<span aria-hidden>✏️</span>}
                onClick={() => setEditOpen(true)}
              >
                Editează mașina
              </Button>
            )}

            <CarLimits
              car={data}
              canEdit={session.role === "manager"}
              onRequested={car.reload}
            />

            <CarDocuments
              car={data}
              canUpload={session.role === "manager"}
              onUploaded={car.reload}
            />

            <Section title="Sumar 6 luni">
              <Async resource={summary}>
                {(months) => {
                  const liters = months.reduce((s, m) => s + m.liters, 0);
                  const km = months.reduce((s, m) => s + m.km, 0);
                  const total = months.reduce((s, m) => s + m.total, 0);
                  return (
                    <Card withBorder radius="lg" padding="md" shadow="xs">
                      <SimpleGrid cols={2} spacing="sm">
                        <KV label="Total cheltuit" value={formatLei(total)} accent />
                        <KV label="Total litri" value={formatLiters(liters)} />
                        <KV label="Distanță" value={`${km.toLocaleString("ro-RO")} km`} />
                        <KV
                          label="Consum mediu"
                          value={km > 0 ? `${Math.round((liters / km) * 1000) / 10} L/100km` : "—"}
                        />
                      </SimpleGrid>
                    </Card>
                  );
                }}
              </Async>
            </Section>

            <Section title="Consum mediu lunar (L/100km)">
              <Async resource={summary}>
                {(months) => (
                  <Card withBorder radius="lg" padding="md" shadow="xs">
                    <BarChart
                      h={200}
                      data={months.map((m) => ({ month: formatMonth(m.month), value: m.consumption }))}
                      dataKey="month"
                      series={[{ name: "value", label: "L/100km", color: "brand.6" }]}
                      withYAxis={false}
                      valueFormatter={(v) => `${v} L`}
                      withBarValueLabel
                      valueLabelProps={{ position: "inside", fill: "white", fontSize: 14, fontWeight: 700 }}
                      barProps={{ radius: 6 }}
                    />
                  </Card>
                )}
              </Async>
            </Section>

            <Async resource={txs}>
              {(list) => (
                <Section title={`Alimentări, ultimul an (${list.length})`}>
                  <Card withBorder padding={0} radius="lg" shadow="xs">
                    {list.length === 0 ? (
                      <Text p="md" size="sm" c="dimmed">
                        Nicio alimentare în ultimul an.
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
                                <Group gap={6} wrap="nowrap">
                                  <Text size="sm" fw={600} truncate>
                                    {t.stationName ?? "Stație necunoscută"}
                                  </Text>
                                  <SupplierBadge supplier={t.supplier} />
                                </Group>
                                <Text size="xs" c="dimmed">
                                  {t.date ? formatDateTime(t.date) : "—"}
                                  {t.liters != null && ` · ${formatLiters(t.liters)}`}
                                  {t.kmDriven != null && ` · ${t.kmDriven} km`}
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
                          // Linkul exista doar cand importul a potrivit statia in nomenclator.
                          return session.role === "manager" && t.stationId ? (
                            <Anchor
                              key={t.id}
                              component={Link}
                              to={`/manager/station/${t.stationId}`}
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
              )}
            </Async>

            <CarForm
              car={data}
              opened={editOpen}
              onClose={() => setEditOpen(false)}
              onSaved={car.reload}
            />
          </>
        )}
      </Async>
    </AppShell>
  );
}

function Header({ car }: { car: CarDetail }) {
  const details = [car.year && `An ${car.year}`, car.fuel && FUEL_LABEL[car.fuel]]
    .filter(Boolean)
    .join(" · ");
  const name = [car.brand, car.model].filter((v) => v && v !== "-").join(" ");

  return (
    <Card withBorder radius="lg" padding="md" shadow="xs" mb="md">
      <Group wrap="nowrap" gap="sm">
        <ThemeIcon variant="light" color="brand" size={80} radius="lg" style={{ fontSize: 44 }}>
          {car.segment === "autoutilitara" ? "🚐" : "🚗"}
        </ThemeIcon>
        <Stack gap={0} style={{ flex: 1 }}>
          <Text size="10px" fw={700} tt="uppercase" c="gray.6" style={{ letterSpacing: "0.08em" }}>
            {car.segment ? SEGMENT_LABEL[car.segment] : "Segment necompletat"}
          </Text>
          <Title order={3} ff="monospace">
            {car.plate}
          </Title>
          {name && <Text c="gray.7">{name}</Text>}
          {details && (
            <Text size="xs" c="dimmed">
              {details}
            </Text>
          )}
        </Stack>
      </Group>
      {car.driverName && (
        <>
          <Divider my="sm" />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Șofer
            </Text>
            <Text size="sm" fw={600}>
              {car.driverName}
              {car.driverCardMasked ? ` · card ${car.driverCardMasked}` : ""}
            </Text>
          </Group>
        </>
      )}
    </Card>
  );
}

function KV({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Stack
      gap={2}
      p="sm"
      c={accent ? "white" : undefined}
      style={{
        borderRadius: 12,
        background: accent
          ? "var(--mantine-color-dark-8)"
          : "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))",
      }}
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
      <Text fz={18} fw={800}>
        {value}
      </Text>
    </Stack>
  );
}
