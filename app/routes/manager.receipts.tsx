import { Link } from "react-router";
import {
  Anchor,
  Badge,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { AppShell } from "~/components/AppShell";
import { receipts } from "~/lib/data";
import { formatDate, formatLei } from "~/lib/format";
import { useSession } from "./auth-layout";

export default function ManagerReceipts() {
  const session = useSession();

  const totalUnpaid = receipts
    .filter((r) => r.status === "unpaid")
    .reduce((s, r) => s + r.total, 0);

  return (
    <AppShell session={session} title="Facturi" back="/manager">
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
              {receipts.filter((r) => r.status === "unpaid").length} facturi neachitate
            </Text>
          </Card>
        )}

        <Card withBorder padding={0} radius="lg" shadow="xs">
          <Stack gap={0}>
            {receipts.map((r, i, arr) => (
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
                      : "1px solid var(--mantine-color-gray-1)",
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
                    <Text size="xs" c="dimmed" truncate>
                      {r.supplier}
                    </Text>
                    <Text size="10px" c="gray.5">
                      Emisă {formatDate(r.issueDate)} · scadență {formatDate(r.dueDate)}
                    </Text>
                  </Stack>
                  <Stack gap={4} align="end">
                    <Text size="sm" fw={700}>
                      {formatLei(r.total)}
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
      </Stack>
    </AppShell>
  );
}
