import { useState } from "react";
import { Button, Chip, Group, Stack, Text, TextInput } from "@mantine/core";
import { AppShell } from "~/components/AppShell";
import { Async } from "~/components/Async";
import { CarCard } from "~/components/CarCard";
import { CarForm } from "~/components/CarForm";
import { type Car, carHasExpiredDoc, listCars } from "~/lib/fleet";
import { useResource } from "~/lib/useResource";
import { useSession } from "./auth-layout";

type Filter = "all" | "expired" | "mica" | "autoutilitara";

/** Flota reala are sute de masini, deci lista se desfasoara in transe, nu dintr-o data. */
const PAGE = 30;

export default function ManagerCarsRoute() {
  const session = useSession();
  const cars = useResource(() => listCars(), []);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [formOpen, setFormOpen] = useState(false);

  function matches(car: Car) {
    if (filter === "expired" && !carHasExpiredDoc(car)) return false;
    if ((filter === "mica" || filter === "autoutilitara") && car.segment !== filter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [car.plate, car.brand, car.model, car.driverName]
      .filter(Boolean)
      .some((v) => v!.toLowerCase().includes(q));
  }

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

      <Async resource={cars}>
        {(list) => {
          const filtered = list.filter(matches);
          const expiredCount = list.filter(carHasExpiredDoc).length;
          // Segmentul nu vine din portal: pe datele reale este gol la aproape toate masinile, iar
          // doua filtre care nu intorc nimic sunt mai rele decat absenta lor.
          const hasSegments = list.some((c) => c.segment);

          return (
            <>
              <TextInput
                placeholder="Caută după număr, marcă, model sau șofer"
                value={search}
                onChange={(e) => {
                  setSearch(e.currentTarget.value);
                  setShown(PAGE);
                }}
                mb="sm"
                radius="md"
              />

              <Chip.Group
                multiple={false}
                value={filter}
                onChange={(v) => {
                  setFilter(v as Filter);
                  setShown(PAGE);
                }}
              >
                <Group gap="xs" wrap="nowrap" mb="md" style={{ overflowX: "auto" }}>
                  <Chip value="all" radius="xl">{`Toate (${list.length})`}</Chip>
                  <Chip value="expired" radius="xl" color="red">{`Expirate (${expiredCount})`}</Chip>
                  {hasSegments && (
                    <>
                      <Chip value="mica" radius="xl">
                        Mici
                      </Chip>
                      <Chip value="autoutilitara" radius="xl">
                        Utilitare
                      </Chip>
                    </>
                  )}
                </Group>
              </Chip.Group>

              <Stack gap="xs">
                {filtered.slice(0, shown).map((c) => (
                  <CarCard key={c.id} car={c} />
                ))}
                {filtered.length === 0 && (
                  <Text ta="center" c="dimmed" py="xl" size="sm">
                    Nicio mașină în filtru.
                  </Text>
                )}
                {filtered.length > shown && (
                  <Button variant="default" onClick={() => setShown((n) => n + PAGE)}>
                    Arată încă {Math.min(PAGE, filtered.length - shown)} din {filtered.length}
                  </Button>
                )}
              </Stack>
            </>
          );
        }}
      </Async>

      <CarForm opened={formOpen} onClose={() => setFormOpen(false)} onSaved={cars.reload} />
    </AppShell>
  );
}
