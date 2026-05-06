import { useState } from "react";
import { Chip, Group, Stack, Text } from "@mantine/core";
import { AppShell } from "~/components/AppShell";
import { CarCard } from "~/components/CarCard";
import { cars, carHasExpiredDoc } from "~/lib/data";
import { useSession } from "./auth-layout";

type Filter = "all" | "expired" | "small" | "utility";

export default function ManagerCarsRoute() {
  const session = useSession();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = cars.filter((c) => {
    if (filter === "expired") return carHasExpiredDoc(c);
    if (filter === "small") return c.segment === "small";
    if (filter === "utility") return c.segment === "utility";
    return true;
  });

  const expiredCount = cars.filter(carHasExpiredDoc).length;

  return (
    <AppShell session={session} title="Toate mașinile" back="/manager">
      <Chip.Group multiple={false} value={filter} onChange={(v) => setFilter(v as Filter)}>
        <Group gap="xs" wrap="nowrap" mb="md" style={{ overflowX: "auto" }}>
          <Chip value="all" radius="xl">{`Toate (${cars.length})`}</Chip>
          <Chip value="expired" radius="xl" color="red">{`Expirate (${expiredCount})`}</Chip>
          <Chip value="small" radius="xl">Mici</Chip>
          <Chip value="utility" radius="xl">Utilitare</Chip>
        </Group>
      </Chip.Group>

      <Stack gap="xs">
        {filtered.map((c) => (
          <CarCard key={c.id} car={c} />
        ))}
        {filtered.length === 0 && (
          <Text ta="center" c="dimmed" py="xl" size="sm">
            Nicio mașină în filtru.
          </Text>
        )}
      </Stack>
    </AppShell>
  );
}
