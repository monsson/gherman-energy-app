import { useState } from "react";
import { useParams } from "react-router";
import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { AppShell, Section } from "~/components/AppShell";
import { Async } from "~/components/Async";
import { downloadInvoice, getInvoice, invoiceTransactions } from "~/lib/fleet";
import { formatDate, formatDateTime, formatLei, formatLiters } from "~/lib/format";
import { useResource } from "~/lib/useResource";
import { useSession } from "./auth-layout";

export default function ManagerReceipt() {
  const session = useSession();
  const { id = "" } = useParams();
  const detail = useResource(() => getInvoice(id), [id]);
  const [showTx, setShowTx] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function download() {
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadInvoice(id);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "PDF-ul nu a putut fi descărcat.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <AppShell
      session={session}
      title={detail.data?.invoice.number ?? "Factură"}
      back="/manager/receipts"
    >
      <Async resource={detail}>
        {({ invoice, supplier, lines }) => (
          <>
            <Card withBorder radius="lg" padding="md" shadow="xs" mb="md">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Text size="10px" fw={700} tt="uppercase" c="gray.6" style={{ letterSpacing: "0.08em" }}>
                    Factură fiscală
                  </Text>
                  <Text fz={20} fw={800}>
                    {invoice.number}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Emisă {invoice.date ? formatDate(invoice.date) : "—"}
                    {invoice.dueDate && ` · scadență ${formatDate(invoice.dueDate)}`}
                  </Text>
                </Stack>
                <Badge
                  size="lg"
                  variant="light"
                  color={invoice.status === "paid" ? "brand" : "red"}
                  c={invoice.status === "paid" ? "dark.8" : undefined}
                >
                  {invoice.status === "paid" ? "Achitată" : "Neachitată"}
                </Badge>
              </Group>

              <Divider my="sm" />

              {/* Pe o factura client furnizorul suntem noi, nu compania de carburant. */}
              <Stack gap={4}>
                <Text size="10px" fw={700} tt="uppercase" c="gray.6" style={{ letterSpacing: "0.08em" }}>
                  Furnizor
                </Text>
                <Text size="sm" fw={600}>
                  {supplier?.name ?? "—"}
                </Text>
                {supplier?.cui && (
                  <Text size="xs" c="dimmed">
                    CUI {supplier.cui}
                  </Text>
                )}
                {supplier?.address && (
                  <Text size="xs" c="dimmed">
                    {supplier.address}
                  </Text>
                )}
              </Stack>

              <Divider my="sm" />

              {/* Beneficiarul este partenerul din profil. CUI-ul lui nu vine in `ProfilPwa`. */}
              <Stack gap={4}>
                <Text size="10px" fw={700} tt="uppercase" c="gray.6" style={{ letterSpacing: "0.08em" }}>
                  Beneficiar
                </Text>
                <Text size="sm" fw={600}>
                  {session.partenerNume ?? "—"}
                </Text>
              </Stack>
            </Card>

            <Section title="Sumar">
              <Card withBorder radius="lg" padding="md" shadow="xs">
                <SimpleGrid cols={2} spacing="sm">
                  <KV label="Total" value={formatLei(invoice.total ?? 0)} accent />
                  <KV
                    label={invoice.status === "paid" ? "Sold" : "Rest de plată"}
                    value={formatLei(invoice.balance ?? 0)}
                  />
                </SimpleGrid>
                <Divider my="sm" />
                <Stack gap={4}>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Subtotal (fără TVA)
                    </Text>
                    <Text size="sm" fw={600}>
                      {formatLei(invoice.subtotal ?? 0)}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      TVA
                    </Text>
                    <Text size="sm" fw={600}>
                      {formatLei(invoice.vat ?? 0)}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" fw={700}>
                      Total de plată
                    </Text>
                    <Text size="sm" fw={800}>
                      {formatLei(invoice.total ?? 0)}
                    </Text>
                  </Group>
                </Stack>
              </Card>
              <Button mt="sm" fullWidth size="md" onClick={download} loading={downloading}>
                📄 Descarcă PDF
              </Button>
              {downloadError && (
                <Text size="xs" c="red.7" mt="xs">
                  {downloadError}
                </Text>
              )}
            </Section>

            {lines.length > 0 && (
              <Section title="Linii factură">
                <Card withBorder radius="lg" padding={0} shadow="xs" style={{ overflowX: "auto" }}>
                  <Table striped={false} verticalSpacing="xs" horizontalSpacing="sm" fz="xs">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Denumire</Table.Th>
                        <Table.Th ta="right">Cant.</Table.Th>
                        <Table.Th ta="right">Preț</Table.Th>
                        <Table.Th ta="right">Total</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {lines.map((l, i) => (
                        <Table.Tr key={l.no ?? i}>
                          <Table.Td>{l.name ?? "—"}</Table.Td>
                          <Table.Td ta="right">
                            {l.cnt != null ? `${l.cnt} ${l.unit ?? ""}`.trim() : "—"}
                          </Table.Td>
                          <Table.Td ta="right">
                            {l.priceNoVat != null ? l.priceNoVat.toFixed(2) : "—"}
                          </Table.Td>
                          <Table.Td ta="right" fw={600}>
                            {formatLei(l.totalWithVat ?? l.totalNoVat ?? 0)}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Card>
              </Section>
            )}

            <Section title="Alimentări din perioada facturii">
              {showTx ? (
                <InvoiceTransactions id={id} />
              ) : (
                <Button variant="default" fullWidth onClick={() => setShowTx(true)}>
                  Arată alimentările
                </Button>
              )}
            </Section>
          </>
        )}
      </Async>
    </AppShell>
  );
}

/**
 * Alimentarile facturate. Se cer abia cand se deschide sectiunea: lista de facturi nu are ce face
 * cu ele, iar pentru o luna intreaga sunt sute de randuri.
 */
function InvoiceTransactions({ id }: { id: string }) {
  const txs = useResource(() => invoiceTransactions(id), [id]);

  return (
    <Async resource={txs}>
      {(list) => (
        <>
          <Text size="xs" c="dimmed" mb="xs">
            Alimentările sunt atribuite după perioada facturii, nu una câte una: legătura exactă
            factură–alimentare nu există în date.
          </Text>
          <Card withBorder padding={0} radius="lg" shadow="xs">
            {list.length === 0 ? (
              <Text p="md" size="sm" c="dimmed">
                Nicio alimentare pentru perioada acestei facturi. Se întâmplă când factura nu este
                Rompetrol sau când luna ei nu are încă alimentările descărcate.
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
                        {t.plate ?? "—"} · {t.stationName ?? "Stație necunoscută"}
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
        </>
      )}
    </Async>
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
