import { Link } from "react-router";
import { Badge, Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { type Car, carHasExpiredDoc, getDriver } from "~/lib/data";

const SEGMENT_GLYPH: Record<Car["segment"], string> = {
  small: "🚗",
  utility: "🚐",
};

export function CarCard({ car, to }: { car: Car; to?: string }) {
  const expired = carHasExpiredDoc(car);
  const driver = getDriver(car.driverId);
  const target = to ?? `/car/${car.id}`;

  return (
    <Card
      component={Link}
      to={target}
      withBorder
      padding="sm"
      radius="lg"
      shadow="xs"
      style={{
        textDecoration: "none",
        color: "inherit",
        borderColor: expired ? "var(--mantine-color-red-4)" : undefined,
        outline: expired ? "1px solid var(--mantine-color-red-2)" : undefined,
      }}
    >
      <Group wrap="nowrap" gap="sm">
        <ThemeIcon
          size={56}
          radius="md"
          variant="light"
          color={expired ? "red" : "brand"}
          style={{ fontSize: 28 }}
        >
          <span aria-hidden>{SEGMENT_GLYPH[car.segment]}</span>
        </ThemeIcon>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Text fw={700} truncate>
              {car.brand} {car.model}
            </Text>
            {expired && (
              <Badge color="red" variant="light" size="xs">
                Expirat
              </Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed" ff="monospace">
            {car.plate}
          </Text>
          {driver && (
            <Text size="xs" c="dimmed" truncate>
              Card •••• {driver.cardNumber} · {driver.name}
            </Text>
          )}
        </Stack>
        <Text c="gray.4" fz={20} fw={700}>
          ›
        </Text>
      </Group>
    </Card>
  );
}
