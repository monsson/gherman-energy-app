import { Link, useParams } from "react-router";
import {
  Anchor,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { BarChart } from "@mantine/charts";
import { AppShell, Section } from "~/components/AppShell";
import {
  getCar,
  getDriver,
  isExpired,
  monthlyAggregate,
  stations,
  transactionsForCar,
} from "~/lib/data";
import { formatDate, formatDateTime, formatLei } from "~/lib/format";
import { downloadPdf } from "~/lib/pdf";
import { useSession } from "./auth-layout";

export default function CarDetail() {
  const session = useSession();
  const { id } = useParams();
  const car = getCar(Number(id));
  const back = session.role === "manager" ? "/manager/cars" : "/driver";

  if (!car) {
    return (
      <AppShell session={session} title="Mașină" back={back}>
        <Text ta="center" c="dimmed" py="xl">
          Mașină inexistentă.
        </Text>
      </AppShell>
    );
  }

  const driver = getDriver(car.driverId);
  const txs = transactionsForCar(car.id);
  const totalLiters = txs.reduce((s, t) => s + t.liters, 0);
  const totalSpend = txs.reduce((s, t) => s + t.total, 0);
  const totalKm = txs.reduce((s, t) => s + t.kmDriven, 0);
  const consumption = totalKm > 0 ? Math.round((totalLiters / totalKm) * 1000) / 10 : 0;
  const monthly = monthlyAggregate(txs);

  function handleDownloadTalon() {
    if (!car) return;
    downloadPdf(
      `talon-${car.plate}.pdf`,
      "CERTIFICAT DE INMATRICULARE",
      [
        "(Document fictiv - prototip GE)",
        "",
        `Numar inmatriculare: ${car.plate}`,
        `Marca: ${car.brand}`,
        `Model: ${car.model}`,
        `An fabricatie: ${car.year}`,
        `Tip combustibil: ${car.fuel}`,
        `Sofer asignat: ${driver?.name ?? "-"}`,
        "",
        "ITP valabil pana la: " + formatDate(car.itp),
        "Detinator: GHERMAN ENERGY SRL",
      ],
    );
  }

  function handleDownloadInsurance() {
    if (!car) return;
    downloadPdf(
      `asigurare-${car.plate}.pdf`,
      "POLITA RCA",
      [
        "(Document fictiv - prototip GE)",
        "",
        `Numar inmatriculare: ${car.plate}`,
        `Marca / Model: ${car.brand} ${car.model}`,
        `Asigurat: GHERMAN ENERGY SRL`,
        `Polita nr: GE-${String(car.id).padStart(6, "0")}`,
        "",
        "Valabila de la: " + formatDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()),
        "Valabila pana la: " + formatDate(car.rca),
      ],
    );
  }

  return (
    <AppShell session={session} title={`${car.brand} ${car.model}`} back={back}>
      <Card withBorder radius="lg" padding="md" shadow="xs" mb="md">
        <Group wrap="nowrap" gap="sm">
          <ThemeIcon variant="light" color="brand" size={80} radius="lg" style={{ fontSize: 44 }}>
            {car.segment === "small" ? "🚗" : "🚐"}
          </ThemeIcon>
          <Stack gap={0} style={{ flex: 1 }}>
            <Text size="10px" fw={700} tt="uppercase" c="gray.6" style={{ letterSpacing: "0.08em" }}>
              {car.segment === "small" ? "Autoturism mic" : "Utilitară mică"}
            </Text>
            <Title order={3}>
              {car.brand} {car.model}
            </Title>
            <Text ff="monospace" c="gray.7">
              {car.plate}
            </Text>
            <Text size="xs" c="dimmed">
              An {car.year} · {car.fuel}
            </Text>
          </Stack>
        </Group>
        {driver && (
          <>
            <Divider my="sm" />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Șofer
              </Text>
              <Text size="sm" fw={600}>
                {driver.name} · card •••• {driver.cardNumber}
              </Text>
            </Group>
          </>
        )}
      </Card>

      <Section title="Documente">
        <Stack gap="xs">
          <DocRow label="ITP" date={car.itp} />
          <DocRow label="RCA" date={car.rca} />
          <DocRow label="Rovignetă" date={car.rovigneta} />
        </Stack>
        <SimpleGrid cols={2} spacing="xs" mt="sm">
          <Button variant="default" size="md" onClick={handleDownloadTalon}>
            📄 Talon
          </Button>
          <Button variant="default" size="md" onClick={handleDownloadInsurance}>
            📑 Asigurare
          </Button>
        </SimpleGrid>
      </Section>

      <Section title="Sumar consum">
        <Card withBorder radius="lg" padding="md" shadow="xs">
          <SimpleGrid cols={2} spacing="sm">
            <KV label="Total cheltuit" value={formatLei(totalSpend)} accent />
            <KV label="Total litri" value={`${Math.round(totalLiters)} L`} />
            <KV label="Distanță" value={`${totalKm.toLocaleString("ro-RO")} km`} />
            <KV label="Consum mediu" value={`${consumption} L/100km`} />
          </SimpleGrid>
        </Card>
      </Section>

      <Section title="Consum mediu lunar (L/100km)">
        <Card withBorder radius="lg" padding="md" shadow="xs">
          <BarChart
            h={200}
            data={monthly.map((m) => ({ month: m.label, value: m.consumption }))}
            dataKey="month"
            series={[{ name: "value", label: "L/100km", color: "brand.6" }]}
            withYAxis={false}
            valueFormatter={(v) => `${v} L`}
            withBarValueLabel
            valueLabelProps={{ position: "inside", fill: "white", fontSize: 14, fontWeight: 700 }}
            barProps={{ radius: 6 }}
          />
        </Card>
      </Section>

      <Section title={`Tranzacții (${txs.length})`}>
        <Card withBorder padding={0} radius="lg" shadow="xs">
          <Stack gap={0}>
            {txs.map((t, i, arr) => {
              const station = stations.find((s) => s.id === t.stationId)!;
              const isManager = session.role === "manager";
              const Row = (
                <Group wrap="nowrap" gap="sm" p="sm">
                  <ThemeIcon variant="light" color="brand" size={40} radius="md">
                    ⛽
                  </ThemeIcon>
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>
                      {station.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatDateTime(t.date)} · {t.liters.toFixed(1)} L · {t.kmDriven} km
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
              );
              const borderBottom =
                i === arr.length - 1 ? "none" : "1px solid var(--mantine-color-gray-1)";
              return isManager ? (
                <Anchor
                  key={t.id}
                  component={Link}
                  to={`/manager/station/${station.id}`}
                  underline="never"
                  c="inherit"
                  style={{ borderBottom }}
                >
                  {Row}
                </Anchor>
              ) : (
                <div key={t.id} style={{ borderBottom }}>
                  {Row}
                </div>
              );
            })}
          </Stack>
        </Card>
      </Section>
    </AppShell>
  );
}

function DocRow({ label, date }: { label: string; date: string }) {
  const expired = isExpired(date);
  return (
    <Paper
      withBorder
      radius="lg"
      p="sm"
      bg={expired ? "red.0" : undefined}
      style={{ borderColor: expired ? "var(--mantine-color-red-3)" : undefined }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap" gap="sm">
          <ThemeIcon variant="light" color={expired ? "red" : "brand"} size={36} radius="md">
            <Text fw={800}>{expired ? "!" : "✓"}</Text>
          </ThemeIcon>
          <Stack gap={0}>
            <Text size="10px" fw={700} tt="uppercase" c="gray.6" style={{ letterSpacing: "0.08em" }}>
              {label}
            </Text>
            <Text fw={700} c={expired ? "red.7" : undefined}>
              {formatDate(date)}
            </Text>
          </Stack>
        </Group>
        <Badge variant="light" color={expired ? "red" : "brand"} c={expired ? undefined : "dark.8"}>
          {expired ? "Expirat" : "Valabil"}
        </Badge>
      </Group>
    </Paper>
  );
}

function KV({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Stack
      gap={2}
      p="sm"
      bg={accent ? "dark.8" : "gray.0"}
      c={accent ? "white" : undefined}
      style={{ borderRadius: 12 }}
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
