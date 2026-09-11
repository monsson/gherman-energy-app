import { useState } from "react";
import { Link } from "react-router";
import { Anchor, Badge, Button, Card, Group, Stack, Text, TextInput, ThemeIcon } from "@mantine/core";
import { AppShell } from "~/components/AppShell";
import { Async } from "~/components/Async";
import { listStations } from "~/lib/fleet";
import { useResource } from "~/lib/useResource";
import { useSession } from "./auth-layout";

// Nomenclatorul real are 200 de statii, deci lista nu se randeaza dintr-o data.
const PAGE = 30;

export default function ManagerStations() {
  const session = useSession();
  const stations = useResource(() => listStations(), []);
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE);

  return (
    <AppShell session={session} title="Stații" back="/manager">
      <Async resource={stations}>
        {(list) => {
          const q = search.trim().toLowerCase();
          const filtered = q
            ? list.filter((s) => `${s.name} ${s.address ?? ""}`.toLowerCase().includes(q))
            : list;

          return (
            <>
              <TextInput
                placeholder="Caută stația"
                value={search}
                onChange={(e) => {
                  setSearch(e.currentTarget.value);
                  setShown(PAGE);
                }}
                mb="md"
                radius="md"
              />

              <Card withBorder padding={0} radius="lg" shadow="xs">
                <Stack gap={0}>
                  {filtered.slice(0, shown).map((s, i, arr) => (
                    <Anchor
                      key={s.id}
                      component={Link}
                      to={`/manager/station/${s.id}`}
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
                        <ThemeIcon variant="light" color="yellow" size={40} radius="md">
                          🏪
                        </ThemeIcon>
                        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={600} truncate>
                            {s.name}
                          </Text>
                          {s.address && (
                            <Text size="xs" c="dimmed" truncate>
                              {s.address}
                            </Text>
                          )}
                        </Stack>
                        <Stack gap={4} align="end">
                          {s.petrolPrice != null && (
                            <Badge variant="filled" color="brand" size="sm" radius="sm" c="dark.8">
                              B {s.petrolPrice.toFixed(2)}
                            </Badge>
                          )}
                          {s.dieselPrice != null && (
                            <Badge variant="filled" color="orange" size="sm" radius="sm">
                              M {s.dieselPrice.toFixed(2)}
                            </Badge>
                          )}
                        </Stack>
                      </Group>
                    </Anchor>
                  ))}
                  {filtered.length === 0 && (
                    <Text p="md" size="sm" c="dimmed" ta="center">
                      Nicio stație găsită.
                    </Text>
                  )}
                </Stack>
              </Card>

              {filtered.length > shown && (
                <Button variant="default" fullWidth mt="sm" onClick={() => setShown((n) => n + PAGE)}>
                  Arată încă {Math.min(PAGE, filtered.length - shown)} din {filtered.length}
                </Button>
              )}
            </>
          );
        }}
      </Async>
    </AppShell>
  );
}
