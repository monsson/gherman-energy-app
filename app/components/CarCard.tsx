import { Link } from "react-router";
import { Badge, Card, Group, Progress, Stack, Text, ThemeIcon } from "@mantine/core";
import { type Car, carHasExpiredDoc, isBlocked, NEAR_LIMIT } from "~/lib/fleet";
import { formatLei, formatLiters } from "~/lib/format";

const SEGMENT_GLYPH: Record<string, string> = {
  mica: "🚗",
  autoutilitara: "🚐",
};

/** Portalul nu are marca si model la peste 90% din vehicule; importul scrie "-" in locul lor. */
function known(value?: string): string | undefined {
  const text = value?.trim();
  return text && text !== "-" ? text : undefined;
}

export function CarCard({
  car,
  to,
  showLimit,
}: {
  car: Car;
  to?: string;
  /** Bara de plafon lunar. Ecranul de sofer o arata, listele de flota nu. */
  showLimit?: boolean;
}) {
  const expired = carHasExpiredDoc(car);
  const blocked = isBlocked(car);
  const target = to ?? `/car/${car.id}`;
  const name = [known(car.brand), known(car.model)].filter(Boolean).join(" ");
  const used = car.usedLiters ?? 0;
  const limit = car.limitLiters;
  const pct = limit && limit > 1 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

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
          <span aria-hidden>{(car.segment && SEGMENT_GLYPH[car.segment]) ?? "🚗"}</span>
        </ThemeIcon>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            {/* Numarul de inmatriculare este titlul: marca si modelul lipsesc pe datele reale. */}
            <Text fw={700} ff="monospace" truncate>
              {car.plate}
            </Text>
            {expired && (
              <Badge color="red" variant="light" size="xs">
                Expirat
              </Badge>
            )}
          </Group>
          {name && (
            <Text size="sm" c="dimmed" truncate>
              {name}
            </Text>
          )}
          {car.driverName && (
            <Text size="xs" c="dimmed" truncate>
              {car.driverName}
            </Text>
          )}
          {showLimit && (
            <Stack gap={2} mt={4}>
              {blocked ? (
                <Badge color="orange" variant="light" size="sm">
                  Blocată la alimentare
                </Badge>
              ) : limit ? (
                <>
                  <Group justify="space-between" gap="xs">
                    <Text size="xs" c="dimmed">
                      {formatLiters(used)} / {formatLiters(limit)}
                    </Text>
                    <Text size="xs" fw={700}>
                      {formatLei(car.usedLei ?? 0)}
                    </Text>
                  </Group>
                  {/* Culorile sunt semantice, nu de brand: verde nu cere nimic, portocaliu
                      inseamna "se apropie", rosu "a depasit". `brand` nu poate fi folosit pentru
                      starea normala - auriul Gherman Energy (#FFC000) este el insusi galben, deci
                      nu s-ar deosebi de portocaliul de avertizare. Rosul si portocaliul sunt deja
                      folosite semantic in aplicatie (documente expirate, masina blocata). */}
                  <Progress
                    value={pct}
                    color={pct >= 100 ? "red" : pct >= NEAR_LIMIT * 100 ? "orange" : "teal"}
                    radius="xl"
                    size="sm"
                  />
                </>
              ) : (
                <Group justify="space-between" gap="xs">
                  <Text size="xs" c="dimmed">
                    Fără plafon · {formatLiters(used)} luna aceasta
                  </Text>
                  <Text size="xs" fw={700}>
                    {formatLei(car.usedLei ?? 0)}
                  </Text>
                </Group>
              )}
            </Stack>
          )}
        </Stack>
        <Text c="gray.4" fz={20} fw={700}>
          ›
        </Text>
      </Group>
    </Card>
  );
}
