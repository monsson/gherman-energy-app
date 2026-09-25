import { Badge, Card, Group, Progress, Stack, Text } from "@mantine/core";
import {
  FLEET_LIMIT_STATE_LABEL,
  type FleetLimit,
  fleetUsageRatio,
  isFleetLimitStale,
  NEAR_LIMIT,
} from "~/lib/fleet";
import { formatDateTime, formatLei } from "~/lib/format";

/**
 * Limita de credit a unei flote in portal: cat a ramas, cat s-a consumat, din cat.
 *
 * **Lei, nu litri** - este creditul dat clientului, nu plafonul unei masini, deci nu are unitatea
 * plafoanelor si nu se compara cu ele. Nu numeste nicio perioada ("luna aceasta"): portalul nu spune
 * cand se reface limita. Ora citirii sta mereu sub cifre, fiindca soldul este o copie de pana la o
 * jumatate de ora, nu unul in timp real.
 */
export function FleetLimitCard({ limit }: { limit: FleetLimit }) {
  const ratio = fleetUsageRatio(limit);
  const remaining = limit.remainingLei;
  const exhausted = remaining != null && remaining <= 0;
  const stale = isFleetLimitStale(limit);

  // Aceleasi culori semantice ca bara plafonului din `CarCard`: teal in regula, portocaliu aproape,
  // rosu epuizat. O flota blocata e tot rosie - spre deosebire de o masina, oprita nu e un vehicul,
  // ci toata flota.
  const color = exhausted ? "red" : ratio != null && ratio >= NEAR_LIMIT ? "orange" : "teal";

  const badge =
    limit.state === "blocata"
      ? { color: "red", text: FLEET_LIMIT_STATE_LABEL.blocata }
      : limit.state === "nelimitata"
        ? { color: "gray", text: FLEET_LIMIT_STATE_LABEL.nelimitata }
        : exhausted
          ? { color: "red", text: "Limită epuizată" }
          : ratio != null && ratio >= NEAR_LIMIT
            ? { color: "orange", text: "Aproape de limită" }
            : null;

  return (
    <Card withBorder radius="lg" padding="md" shadow="xs">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Text fw={700} truncate>
            {limit.fleetName}
          </Text>
          {badge && (
            <Badge color={badge.color} variant="light" size="sm" style={{ flexShrink: 0 }}>
              {badge.text}
            </Badge>
          )}
        </Group>

        {limit.state === "limitata" && remaining != null && (
          <>
            <Stack gap={0}>
              <Text size="10px" fw={700} tt="uppercase" c="gray.6" style={{ letterSpacing: "0.08em" }}>
                {remaining < 0 ? "Depășită cu" : "Rămas"}
              </Text>
              <Text fz={24} fw={800} c={exhausted ? "red" : undefined}>
                {formatLei(Math.abs(remaining))}
              </Text>
            </Stack>
            {ratio != null && (
              <Progress value={Math.min(100, ratio * 100)} color={color} radius="xl" size="sm" />
            )}
            <Group justify="space-between" gap="xs">
              <Text size="xs" c="dimmed">
                Consumat {formatLei(limit.usedLei ?? 0)}
              </Text>
              <Text size="xs" c="dimmed">
                din {formatLei(limit.limitLei ?? 0)}
              </Text>
            </Group>
          </>
        )}

        {limit.state === "nelimitata" && (
          <Text size="sm" c="dimmed">
            Flota nu are limită de credit în portal.
          </Text>
        )}

        {limit.state === "blocata" && (
          <Text size="sm" c="red">
            Portalul a oprit alimentările pe toate cardurile flotei. Contactează Gherman Energy.
          </Text>
        )}

        <Text size="xs" c={stale ? "orange" : "dimmed"}>
          {limit.vehicles != null && `${limit.vehicles} ${limit.vehicles === 1 ? "vehicul" : "vehicule"} · `}
          {limit.readAt ? `citit din portal la ${formatDateTime(limit.readAt)}` : "ora citirii necunoscută"}
          {stale && " — citire veche, soldul poate fi altul"}
        </Text>
      </Stack>
    </Card>
  );
}
