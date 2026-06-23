import { useParams } from "react-router";
import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { AppShell, Section } from "~/components/AppShell";
import {
  getReceipt,
  stations,
  transactionsForReceipt,
} from "~/lib/data";
import { formatDate, formatDateTime, formatLei } from "~/lib/format";
import { downloadPdf } from "~/lib/pdf";
import { useSession } from "./auth-layout";

export default function ManagerReceipt() {
  const session = useSession();
  const { id } = useParams();
  const receipt = getReceipt(String(id));

  if (!receipt) {
    return (
      <AppShell session={session} title="Factură" back="/manager/receipts">
        <Text ta="center" c="dimmed" py="xl">
          Factură inexistentă.
        </Text>
      </AppShell>
    );
  }

  const txs = transactionsForReceipt(receipt);

  function handleDownload() {
    if (!receipt) return;
    const lines: string[] = [
      `Numar factura: ${receipt.number}`,
      `Data emiterii: ${formatDate(receipt.issueDate)}`,
      `Data scadentei: ${formatDate(receipt.dueDate)}`,
      `Perioada: ${formatDate(receipt.periodStart)} - ${formatDate(receipt.periodEnd)}`,
      "",
      "FURNIZOR",
      receipt.supplier,
      `CUI: ${receipt.supplierFiscalCode}`,
      receipt.supplierAddress,
      "",
      "BENEFICIAR",
      "GHERMAN ENERGY SRL",
      "CUI: RO40000000",
      "Bd. Mamaia 100, Constanta",
      "",
      `Total alimentari: ${txs.length}`,
      `Total litri: ${receipt.liters.toFixed(1)} L`,
      "",
      `Subtotal (fara TVA): ${formatLei(receipt.subtotal)}`,
      `TVA 19%: ${formatLei(receipt.vat)}`,
      `Total de plata: ${formatLei(receipt.total)}`,
      "",
      `Status: ${receipt.status === "paid" ? "ACHITATA" : "NEACHITATA"}`,
      "",
      "(Document fictiv - prototip GE)",
    ];
    downloadPdf(`factura-${receipt.number}.pdf`, "FACTURA FISCALA", lines);
  }

  return (
    <AppShell session={session} title={receipt.number} back="/manager/receipts">
      <Card withBorder radius="lg" padding="md" shadow="xs" mb="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text
              size="10px"
              fw={700}
              tt="uppercase"
              c="gray.6"
              style={{ letterSpacing: "0.08em" }}
            >
              Factură fiscală
            </Text>
            <Text fz={20} fw={800}>
              {receipt.number}
            </Text>
            <Text size="xs" c="dimmed">
              Emisă {formatDate(receipt.issueDate)} · scadență {formatDate(receipt.dueDate)}
            </Text>
          </Stack>
          <Badge
            size="lg"
            variant="light"
            color={receipt.status === "paid" ? "brand" : "red"}
            c={receipt.status === "paid" ? "dark.8" : undefined}
          >
            {receipt.status === "paid" ? "Achitată" : "Neachitată"}
          </Badge>
        </Group>

        <Divider my="sm" />

        <Stack gap={4}>
          <Text size="10px" fw={700} tt="uppercase" c="gray.6" style={{ letterSpacing: "0.08em" }}>
            Furnizor
          </Text>
          <Text size="sm" fw={600}>
            {receipt.supplier}
          </Text>
          <Text size="xs" c="dimmed">
            CUI {receipt.supplierFiscalCode}
          </Text>
          <Text size="xs" c="dimmed">
            {receipt.supplierAddress}
          </Text>
        </Stack>

        <Divider my="sm" />

        <Stack gap={4}>
          <Text size="10px" fw={700} tt="uppercase" c="gray.6" style={{ letterSpacing: "0.08em" }}>
            Beneficiar
          </Text>
          <Text size="sm" fw={600}>
            Gherman Energy SRL
          </Text>
          <Text size="xs" c="dimmed">
            CUI RO40000000
          </Text>
          <Text size="xs" c="dimmed">
            Bd. Mamaia 100, Constanța
          </Text>
        </Stack>
      </Card>

      <Section title="Sumar">
        <Card withBorder radius="lg" padding="md" shadow="xs">
          <SimpleGrid cols={2} spacing="sm">
            <KV label="Perioadă" value={`${formatDate(receipt.periodStart)} – ${formatDate(receipt.periodEnd)}`} />
            <KV label="Alimentări" value={`${txs.length}`} />
            <KV label="Litri" value={`${receipt.liters.toFixed(1)} L`} />
            <KV label="Total" value={formatLei(receipt.total)} accent />
          </SimpleGrid>
          <Divider my="sm" />
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Subtotal (fără TVA)
              </Text>
              <Text size="sm" fw={600}>
                {formatLei(receipt.subtotal)}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                TVA 19%
              </Text>
              <Text size="sm" fw={600}>
                {formatLei(receipt.vat)}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" fw={700}>
                Total de plată
              </Text>
              <Text size="sm" fw={800}>
                {formatLei(receipt.total)}
              </Text>
            </Group>
          </Stack>
        </Card>
        <Button mt="sm" fullWidth size="md" onClick={handleDownload}>
          📄 Descarcă PDF
        </Button>
      </Section>

      <Section title={`Alimentări incluse (${txs.length})`}>
        <Card withBorder padding={0} radius="lg" shadow="xs">
          <Stack gap={0}>
            {txs.map((t, i, arr) => {
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
        </Card>
      </Section>
    </AppShell>
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
      <Text fz={16} fw={800}>
        {value}
      </Text>
    </Stack>
  );
}

