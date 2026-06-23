import { useState } from "react";
import { Button, Chip, Group, Stack, Text } from "@mantine/core";
import { AppShell } from "~/components/AppShell";
import { CarCard } from "~/components/CarCard";
import { CarForm } from "~/components/CarForm";
import { cars, carHasExpiredDoc, useData } from "~/lib/data";
import { useSession } from "./auth-layout";

type Filter = "all" | "expired" | "small" | "utility";

export default function ManagerCarsRoute() {
  const session = useSession();
  useData(); // re-render when a car is added or edited
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);

  const filtered = cars.filter((c) => {
    if (filter === "expired") return carHasExpiredDoc(c);
    if (filter === "small") return c.segment === "small";
    if (filter === "utility") return c.segment === "utility";
    return true;
  });

  const expiredCount = cars.filter(carHasExpiredDoc).length;

  return (
    <AppShell session={session} title="Toate mașinile" back="/manager">
      <Button
        size="md"
        fullWidth
        fw={700}
        mb="md"
        leftSection={<span aria-hidden>＋</span>}
        onClick={() => setFormOpen(true)}
      >
        Mașină nouă
      </Button>

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

      <CarForm opened={formOpen} onClose={() => setFormOpen(false)} />
    </AppShell>
  );
}
