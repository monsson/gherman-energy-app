import { Stack, Text } from "@mantine/core";
import { COMPANY } from "~/lib/company";

// Official company identity footer, matching the letterhead. Rendered at the
// bottom of every in-app screen via AppShell.
export function CompanyFooter() {
  return (
    <Stack gap={2} align="center" mt="xl" mb="xs">
      <Text size="xs" fw={700} c="dimmed">
        {COMPANY.name}
      </Text>
      <Text size="11px" c="dimmed" ta="center">
        {COMPANY.address}
      </Text>
      <Text size="11px" c="dimmed" ta="center">
        CUI {COMPANY.cui} · Reg. Com. {COMPANY.regCom} · {COMPANY.web}
      </Text>
    </Stack>
  );
}
