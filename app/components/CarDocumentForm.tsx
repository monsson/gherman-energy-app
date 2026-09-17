import { useEffect, useState } from "react";
import { Alert, Button, FileInput, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import {
  CAR_DOCUMENT_TYPES,
  type CarDocumentType,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_LABEL,
  DOCUMENT_MAX_BYTES,
  uploadCarDocument,
} from "~/lib/fleet";

const TYPES = CAR_DOCUMENT_TYPES.map((v) => ({ value: v, label: DOCUMENT_LABEL[v] }));

const ACCEPT = DOCUMENT_EXTENSIONS.map((e) => `.${e}`).join(",");

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/**
 * Continutul fisierului, fara prefixul de data URL.
 *
 * `readAsDataURL` da `data:<mime>;base64,<continut>`. Serverul accepta si forma intreaga - tocmai
 * fiindca asa il da un input din browser - dar se trimite doar continutul, ca verificarea de
 * dimensiune sa cada pe acelasi text de ambele parti.
 */
function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Fișierul nu a putut fi citit."));
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Incarcarea unui scan. Numai managerul ajunge aici - serviciul refuza oricum un sofer, inaintea
 * oricarei citiri.
 *
 * Termenul este obligatoriu, desi coloana din baza permite null: documentul curent al unui tip este
 * cel cu termenul cel mai indepartat, deci un rand fara termen nu s-ar mai putea descarca niciodata
 * din aplicatie.
 */
export function CarDocumentForm({
  carId,
  type,
  opened,
  onClose,
  onSaved,
}: {
  carId: string;
  /** Tipul preselectat, cand formul se deschide de pe randul unui document. */
  type?: CarDocumentType;
  opened: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [docType, setDocType] = useState<CarDocumentType>(type ?? "itp");
  const [expires, setExpires] = useState("");
  const [issued, setIssued] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (opened) {
      setDocType(type ?? "itp");
      setExpires("");
      setIssued("");
      setFile(null);
      setError(null);
    }
  }, [opened, type]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    // Aceleasi refuzuri ca in `DocumenteMasinaPwa`; verificate local, ca sa nu plece 10 MB degeaba.
    if (!expires) {
      setError("Completează data până la care documentul este valabil.");
      return;
    }
    if (issued && issued > expires) {
      setError("Data emiterii nu poate fi după data expirării.");
      return;
    }
    if (!file) {
      setError("Alege documentul scanat.");
      return;
    }
    if (!DOCUMENT_EXTENSIONS.includes(extensionOf(file.name))) {
      setError(`Documentul trebuie să fie unul dintre: ${DOCUMENT_EXTENSIONS.join(", ")}.`);
      return;
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      setError(`Documentul depășește ${DOCUMENT_MAX_BYTES / (1024 * 1024)} MB.`);
      return;
    }

    setBusy(true);
    try {
      await uploadCarDocument({
        carId,
        type: docType,
        issued: issued || undefined,
        expires,
        fileName: file.name,
        contentBase64: await readBase64(file),
      });
      setError(null);
      onSaved?.();
      onClose();
    } catch (err) {
      // Mesajele serverului sunt scrise in romana pentru utilizator: rol fara drept de scriere,
      // extensie refuzata, termene fara sens.
      setError(err instanceof Error ? err.message : "Documentul nu a putut fi încărcat.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Încarcă un document" centered radius="lg">
      <form onSubmit={submit}>
        <Stack gap="sm">
          <Select
            label="Tip document"
            data={TYPES}
            value={docType}
            onChange={(v) => setDocType((v as CarDocumentType) ?? "itp")}
            allowDeselect={false}
          />
          <Group grow>
            <TextInput
              label="Valabil până la"
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Data emiterii"
              type="date"
              value={issued}
              onChange={(e) => setIssued(e.currentTarget.value)}
            />
          </Group>
          <FileInput
            label="Scan"
            placeholder={`${DOCUMENT_EXTENSIONS.join(", ")} · maxim ${DOCUMENT_MAX_BYTES / (1024 * 1024)} MB`}
            accept={ACCEPT}
            value={file}
            onChange={setFile}
            clearable
          />
          <Text size="xs" c="dimmed">
            Un scan încărcat pe același termen îl înlocuiește pe cel vechi. Un termen diferit
            înseamnă o reînnoire și rămâne în istoric.
          </Text>
          {error && (
            <Alert color="red" variant="light" py="xs">
              {error}
            </Alert>
          )}
          <Button type="submit" fw={700} loading={busy}>
            Încarcă documentul
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
