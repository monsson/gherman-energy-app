import { useState } from "react";
import { Alert, Button, PasswordInput, Stack } from "@mantine/core";
import { changePassword } from "~/lib/auth";

const MESSAGES: Record<string, string> = {
  "wrong-current": "Parola actuală este incorectă.",
  "too-short": "Parola nouă trebuie să aibă cel puțin 4 caractere.",
  "no-user": "Cont inexistent.",
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    if (next !== confirm) {
      setError(MESSAGES.mismatch);
      return;
    }
    const result = changePassword(username, current, next);
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
        <Button type="submit" fw={700}>
          Salvează parola
        </Button>
      </Stack>
    </form>
  );
}
