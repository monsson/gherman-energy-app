import { useState } from "react";
import { Alert, Button, PasswordInput, Stack } from "@mantine/core";
import { changePassword, MIN_PASSWORD_LENGTH } from "~/lib/auth";

const MESSAGES: Record<string, string> = {
  "wrong-current": "Parola actuală este incorectă.",
  "too-short": `Parola nouă trebuie să aibă cel puțin ${MIN_PASSWORD_LENGTH} caractere.`,
  "no-user": "Cont inexistent.",
  expired: "Sesiunea a expirat. Autentifică-te din nou.",
  error: "Parola nu a putut fi schimbată. Încearcă din nou.",
  mismatch: "Parolele nu coincid.",
};

export function PasswordChangeForm({
  username,
  onDone,
}: {
  username: string;
  onDone?: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    if (next !== confirm) {
      setError(MESSAGES.mismatch);
      return;
    }
    setBusy(true);
    try {
      const result = await changePassword(username, current, next);
      if (result !== "ok") {
        setError(MESSAGES[result] ?? "Eroare necunoscută.");
        return;
      }
      setError(null);
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      onDone?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <Stack gap="sm">
        <PasswordInput
          label="Parola actuală"
          value={current}
          onChange={(e) => setCurrent(e.currentTarget.value)}
          autoComplete="current-password"
          required
        />
        <PasswordInput
          label="Parolă nouă"
          value={next}
          onChange={(e) => setNext(e.currentTarget.value)}
          autoComplete="new-password"
          required
        />
        <PasswordInput
          label="Confirmă parola nouă"
          value={confirm}
          onChange={(e) => setConfirm(e.currentTarget.value)}
          autoComplete="new-password"
          required
        />
        {error && (
          <Alert color="red" variant="light" py="xs">
            {error}
          </Alert>
        )}
        {success && (
          <Alert color="brand" variant="light" py="xs">
            Parola a fost schimbată.
          </Alert>
        )}
        <Button type="submit" fw={700} loading={busy}>
          Salvează parola
        </Button>
      </Stack>
    </form>
  );
}
