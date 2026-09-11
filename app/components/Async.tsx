import { Navigate } from "react-router";
import { Alert, Button, Center, Group, Loader, Stack, Text } from "@mantine/core";
import type { LoginState } from "~/routes/login";
import type { Resource } from "~/lib/useResource";

const EXPIRAT: LoginState = { notice: "expired" };

/**
 * Cele trei stari ale unei resurse, intr-un singur loc: se incarca, a esuat, e aici.
 *
 * O sesiune expirata nu este o eroare de ecran, ci una de autorizare, deci duce la login in loc sa
 * afiseze un mesaj pe care utilizatorul nu are ce sa faca cu el.
 */
export function Async<T>({
  resource,
  children,
}: {
  resource: Resource<T>;
  children: (data: T) => React.ReactNode;
}) {
  if (resource.expired) return <Navigate to="/" replace state={EXPIRAT} />;

  if (resource.error) {
    return (
      <Alert color="red" variant="light" radius="lg" title="Nu s-au putut încărca datele">
        <Stack gap="sm" align="flex-start">
          <Text size="sm">{resource.error}</Text>
          <Button size="xs" variant="light" onClick={resource.reload}>
            Încearcă din nou
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (resource.data === null) {
    return (
      <Center py="xl">
        <Loader size="md" type="dots" />
      </Center>
    );
  }

  return (
    <>
      {resource.loading && (
        <Group justify="center" py={4}>
          <Loader size="xs" type="dots" />
        </Group>
      )}
      {children(resource.data)}
    </>
  );
}
