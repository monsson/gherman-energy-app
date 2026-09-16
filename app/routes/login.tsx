import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
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
import { getSession, login, LoginError, type LoginErrorCode } from "~/lib/auth";
import { API_ENABLED } from "~/lib/api";
import { COMPANY } from "~/lib/company";

export function meta() {
  return [{ title: "Login — Gherman Energy" }];
}

const LOGIN_ERRORS: Record<LoginErrorCode, string> = {
  "bad-credentials": "Utilizator sau parolă incorecte.",
  unreachable: "Serverul nu răspunde. Verifică conexiunea și încearcă din nou.",
  // Parola a fost corectă, dar contului îi lipsește permisiunea `cuba.restApi.enabled`
  // (rolul `pwa-sofer` / `pwa-manager`). Mesajul spune asta, ca să nu se caute o parolă greșită.
  forbidden:
    "Parola este corectă, dar contul nu are drept de acces la aplicația mobilă. Administratorul trebuie să îi atribuie rolul PWA.",
  locked: "Contul este blocat temporar după prea multe încercări. Așteaptă câteva minute.",
  "auth-disabled": "Autentificarea cu parolă este dezactivată pe server. Contactează administratorul.",
  "client-config":
    "Aplicația nu este configurată corect pentru acest server (client OAuth2 respins). Contactează administratorul.",
  "not-pwa-user": "Contul nu are un rol de aplicație mobilă (șofer sau manager de flotă).",
  unknown: "Autentificarea a eșuat. Încearcă din nou.",
};

/**
 * De ce a ajuns utilizatorul pe login, cand nu a venit de bunavoie. Vine prin `state`-ul navigarii,
 * nu prin URL: nu are ce cauta intr-un link si e bine ca dispare la un refresh - dupa un reload nu
 * mai e nimic de explicat.
 *
 * - `expired` - sesiunea a picat sub utilizator: revalidarea din `auth-layout`, un ecran care
 *   incarca date (`Async`) sau schimbarea parolei (`PasswordChangeForm`).
 * - `sign-in-required` - un URL protejat deschis direct, fara sesiune (bookmark, link trimis).
 */
export type LoginNotice = "expired" | "sign-in-required";

/** Forma lui `state` pentru navigarile catre login. Cine redirectioneaza o construieste tipat. */
export type LoginState = { notice: LoginNotice };

const NOTICES: Record<LoginNotice, string> = {
  expired: "Sesiunea a expirat. Autentifică-te din nou.",
  "sign-in-required": "Autentifică-te pentru a continua.",
};

export default function LoginRoute() {
  const navigate = useNavigate();
  const state = useLocation().state as Partial<LoginState> | null;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    (state?.notice && NOTICES[state.notice]) ?? null,
  );

  useEffect(() => {
    const s = getSession();
    if (s) navigate(s.role === "manager" ? "/manager" : "/driver", { replace: true });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const session = await login(username, password);
      navigate(session.role === "manager" ? "/manager" : "/driver", { replace: true });
    } catch (err) {
      setError(
        err instanceof LoginError ? LOGIN_ERRORS[err.code] : LOGIN_ERRORS.unknown,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      mih="100dvh"
      style={{
        background:
          "linear-gradient(135deg, var(--mantine-color-dark-9), var(--mantine-color-dark-8) 55%, var(--mantine-color-brand-7))",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Center style={{ flex: 1 }} px="md" py="xl">
        <Container size={380} w="100%">
          <Stack align="center" gap="sm" mb="xl" c="white" ta="center">
            <Logo size={96} />
            <Text c="brand.2">Aplicație flotă & șoferi</Text>
          </Stack>

          <Paper radius="lg" shadow="xl" p="lg" component="form" onSubmit={submit}>
            <Stack gap="md">
              {notice && (
                <Alert color="orange" variant="light">
                  {notice}
                </Alert>
              )}
              <TextInput
                label="Utilizator"
                placeholder={API_ENABLED ? "ex: sofer.test" : "ex: fleet"}
                size="md"
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
                disabled={busy}
                autoCapitalize="none"
                autoComplete="username"
                required
              />
              <PasswordInput
                label="Parolă"
                size="md"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                disabled={busy}
                autoComplete="current-password"
                required
              />

              {error && (
                <Alert color="red" variant="light">
                  {error}
                </Alert>
              )}

              <Button type="submit" size="md" fullWidth fw={700} loading={busy}>
                Intră în cont
              </Button>

              {!API_ENABLED && (
                <>
                  <Divider label="Conturi demo" labelPosition="center" />
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">
                      <Code>fleet / fleet</Code> — Fleet Manager
                    </Text>
                    <Text size="xs" c="dimmed">
                      <Code>sofer / sofer</Code> — Șofer
                    </Text>
                  </Stack>
                </>
              )}
            </Stack>
          </Paper>
        </Container>
      </Center>
      <Stack gap={2} align="center" pb="md" px="md">
        <Text ta="center" size="xs" c="brand.2">
          © {COMPANY.name} · {COMPANY.address}
        </Text>
        <Text ta="center" size="11px" c="brand.2" opacity={0.85}>
          CUI {COMPANY.cui} · Reg. Com. {COMPANY.regCom} · {COMPANY.web}
        </Text>
      </Stack>
    </Box>
  );
}
