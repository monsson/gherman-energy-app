import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Alert,
  Box,
  Button,
  Center,
  Code,
  Container,
  Divider,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Logo } from "~/components/Logo";
import { getSession, login } from "~/lib/auth";

export function meta() {
  return [{ title: "Login — Gherman Energy" }];
}

export default function LoginRoute() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (s) navigate(s.role === "manager" ? "/manager" : "/driver", { replace: true });
  }, [navigate]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const session = login(username, password);
    if (!session) {
      setError("Utilizator sau parolă incorecte.");
      return;
    }
    navigate(session.role === "manager" ? "/manager" : "/driver", { replace: true });
  }

  return (
    <Box
      mih="100dvh"
      style={{
        background:
          "linear-gradient(135deg, var(--mantine-color-brand-7), var(--mantine-color-brand-6) 60%, var(--mantine-color-teal-5))",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Center style={{ flex: 1 }} px="md" py="xl">
        <Container size={380} w="100%">
          <Stack align="center" gap="xs" mb="xl" c="white" ta="center">
            <Logo size={84} />
            <Title order={1} c="white">
              Gherman Energy
            </Title>
            <Text c="brand.1">Aplicație flotă & șoferi</Text>
          </Stack>

          <Paper radius="lg" shadow="xl" p="lg" component="form" onSubmit={submit}>
            <Stack gap="md">
              <TextInput
                label="Utilizator"
                placeholder="ex: fleet"
                size="md"
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
                autoCapitalize="none"
                autoComplete="username"
                required
              />
              <PasswordInput
                label="Parolă"
                size="md"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                autoComplete="current-password"
                required
              />

              {error && (
                <Alert color="red" variant="light">
                  {error}
                </Alert>
              )}

              <Button type="submit" size="md" fullWidth fw={700}>
                Intră în cont
              </Button>

              <Divider label="Conturi demo" labelPosition="center" />
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  <Code>fleet / fleet</Code> — Fleet Manager
                </Text>
                <Text size="xs" c="dimmed">
                  <Code>sofer / sofer</Code> — Șofer
                </Text>
              </Stack>
            </Stack>
          </Paper>
        </Container>
      </Center>
      <Text ta="center" size="xs" c="brand.1" pb="md">
        © Gherman Energy · Prototip
      </Text>
    </Box>
  );
}
