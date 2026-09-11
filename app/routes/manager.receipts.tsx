import { Link } from "react-router";
import { Anchor, Badge, Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { AppShell } from "~/components/AppShell";
import { Async } from "~/components/Async";
import { listInvoices } from "~/lib/fleet";
import { formatDate, formatLei } from "~/lib/format";
import { useResource } from "~/lib/useResource";
import { useSession } from "./auth-layout";

export default function ManagerReceipts() {
  const session = useSession();
  // Fara interval, serverul acopera ultimul an - facturile sunt lunare.
  const invoices = useResource(() => listInvoices(), []);

  return (
    <AppShell session={session} title="Facturi" back="/manager">
      <Async resource={invoices}>
        {(list) => {
          const unpaid = list.filter((r) => r.status === "unpaid");
          // Suma de plata este soldul ramas, nu totalul facturii.
          const totalUnpaid = unpaid.reduce((s, r) => s + (r.balance ?? r.total ?? 0), 0);

          return (
            <Stack gap="md">
              {totalUnpaid > 0 && (
                <Card withBorder radius="lg" padding="md" shadow="xs" bg="dark.8" c="white">
                  <Text size="10px" fw={700} tt="uppercase" c="brand.3" style={{ letterSpacing: "0.08em" }}>
                    De plată
                  </Text>
                  <Text fz={24} fw={800} mt={2}>
                    {formatLei(totalUnpaid)}
                  </Text>
                  <Text size="xs" c="gray.3" mt={2}>
                    {unpaid.length} {unpaid.length === 1 ? "factură neachitată" : "facturi neachitate"}
                  </Text>
                </Card>
              )}

              {list.length === 0 && (
                <Text ta="center" c="dimmed" py="xl" size="sm">
                  Nicio factură în ultimul an.
                </Text>
              )}

              {list.length > 0 && (
                <Card withBorder padding={0} radius="lg" shadow="xs">
                  <Stack gap={0}>
                    {list.map((r, i, arr) => (
                      <Anchor
                        key={r.id}
                        component={Link}
                        to={`/manager/receipts/${r.id}`}
                        underline="never"
                        c="inherit"
                        style={{
                          borderBottom:
                            i === arr.length - 1
                              ? "none"
                              : "1px solid var(--mantine-color-default-border)",
                        }}
                      >
                        <Group wrap="nowrap" gap="sm" p="sm">
                          <ThemeIcon
                            variant="light"
                            color={r.status === "paid" ? "brand" : "red"}
                            size={40}
                            radius="md"
                          >
                            🧾
                          </ThemeIcon>
                          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" fw={600} truncate>
                              {r.number}
                            </Text>
                            <Text size="xs" c="dimmed">
                              Emisă {r.date ? formatDate(r.date) : "—"}
                              {r.dueDate && ` · scadență ${formatDate(r.dueDate)}`}
                            </Text>
                            {r.status === "unpaid" && r.balance != null && r.balance !== r.total && (
                              <Text size="10px" c="red.7">
                                Rest de plată {formatLei(r.balance)}
                              </Text>
                            )}
                          </Stack>
                          <Stack gap={4} align="end">
                            <Text size="sm" fw={700}>
                              {formatLei(r.total ?? 0)}
                            </Text>
                            <Badge
                              variant="light"
                              color={r.status === "paid" ? "brand" : "red"}
                              c={r.status === "paid" ? "dark.8" : undefined}
                              size="sm"
                            >
                              {r.status === "paid" ? "Achitată" : "Neachitată"}
                            </Badge>
                          </Stack>
                        </Group>
                      </Anchor>
                    ))}
                  </Stack>
                </Card>
              )}
            </Stack>
          );
        }}
      </Async>
    </AppShell>
  );
}
