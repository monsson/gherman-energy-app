import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Collapse,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { Section } from "~/components/AppShell";
import { Async } from "~/components/Async";
import { CarDocumentForm } from "~/components/CarDocumentForm";
import {
  CAR_DOCUMENT_TYPES,
  canDownloadDoc,
  type CarDetail,
  type CarDocument,
  type CarDocumentType,
  currentDoc,
  DOCUMENT_LABEL,
  docHistory,
  downloadCarDocument,
  isExpired,
  listCarDocuments,
} from "~/lib/fleet";
import { formatBytes, formatDate } from "~/lib/format";
import { useResource } from "~/lib/useResource";

/**
 * Documentele masinii: termenul curent al fiecarui tip, scanul lui si reinnoirile dinaintea lui.
 *
 * Termenele se citesc din documente, nu din `car.itp` / `car.rca` / `car.rovinieta` - sunt aceleasi
 * valori, serverul le deduce din exact aceste randuri, dar aici trebuie oricum sa se stie care rand
 * le da, ca sa se poata descarca scanul potrivit.
 */
export function CarDocuments({
  car,
  canUpload,
  onUploaded,
}: {
  car: CarDetail;
  /** Scrisul este numai al managerului - serviciul refuza un sofer inaintea oricarei citiri. */
  canUpload: boolean;
  /** Termenele masinii se reasaza la incarcare, deci antetul ecranului se reincarca si el. */
  onUploaded?: () => void;
}) {
  const docs = useResource(() => listCarDocuments(car.id), [car.id]);
  const [uploadType, setUploadType] = useState<CarDocumentType | null>(null);

  function saved() {
    docs.reload();
    onUploaded?.();
  }

  return (
    <Section
      title="Documente"
      action={
        canUpload && (
          <Button size="compact-xs" variant="light" onClick={() => setUploadType("itp")}>
            + Încarcă
          </Button>
        )
      }
    >
      <Async resource={docs}>
        {(list) => (
          <Stack gap="xs">
            {CAR_DOCUMENT_TYPES.map((type) => (
              <DocGroup
                key={type}
                carId={car.id}
                type={type}
                current={currentDoc(list, type)}
                history={docHistory(list, type)}
                onUpload={canUpload ? () => setUploadType(type) : undefined}
              />
            ))}
          </Stack>
        )}
      </Async>

      <CarDocumentForm
        carId={car.id}
        type={uploadType ?? undefined}
        opened={uploadType !== null}
        onClose={() => setUploadType(null)}
        onSaved={saved}
      />
    </Section>
  );
}

/** Trei stari, nu doua: valabil, expirat si necunoscut - o data lipsa nu inseamna expirata. */
function DocGroup({
  carId,
  type,
  current,
  history,
  onUpload,
}: {
  carId: string;
  type: CarDocumentType;
  current?: CarDocument;
  history: CarDocument[];
  onUpload?: () => void;
}) {
  const [openHistory, setOpenHistory] = useState(false);
  const date = current?.expires;
  const missing = !date;
  const expired = isExpired(date);

  return (
    <Paper
      withBorder
      radius="lg"
      p="sm"
      style={{ borderColor: expired ? "var(--mantine-color-red-3)" : undefined }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap" gap="sm">
          <ThemeIcon
            variant="light"
            color={expired ? "red" : missing ? "gray" : "brand"}
            size={36}
            radius="md"
          >
            <Text fw={800}>{expired ? "!" : missing ? "?" : "✓"}</Text>
          </ThemeIcon>
          <Stack gap={0}>
            <Text size="10px" fw={700} tt="uppercase" c="gray.6" style={{ letterSpacing: "0.08em" }}>
              {DOCUMENT_LABEL[type]}
            </Text>
            <Text fw={700} c={expired ? "red.7" : missing ? "dimmed" : undefined}>
              {date ? formatDate(date) : "Necompletat"}
            </Text>
          </Stack>
        </Group>
        <Badge
          variant="light"
          color={expired ? "red" : missing ? "gray" : "brand"}
          c={expired || missing ? undefined : "dark.8"}
        >
          {expired ? "Expirat" : missing ? "Necunoscut" : "Valabil"}
        </Badge>
      </Group>

      <Scan carId={carId} type={type} doc={current} onUpload={onUpload} />

      {history.length > 0 && (
        <>
          <Divider my="xs" />
          <UnstyledButton onClick={() => setOpenHistory((v) => !v)}>
            <Text size="xs" c="dimmed" fw={600}>
              {openHistory ? "▾" : "▸"} Reînnoiri anterioare ({history.length})
            </Text>
          </UnstyledButton>
          <Collapse expanded={openHistory}>
            <Stack gap={4} mt="xs">
              {history.map((doc) => (
                <Group key={doc.id} justify="space-between" wrap="nowrap">
                  <Text size="xs" c="dimmed">
                    {doc.expires ? formatDate(doc.expires) : "Fără termen"}
                  </Text>
                  {/* Scanul exista, dar API-ul da numai documentul curent - deci nu e un buton. */}
                  <Text size="xs" c="dimmed">
                    {doc.hasScan ? "scanat" : "fără scan"}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Collapse>
        </>
      )}
    </Paper>
  );
}

/**
 * Randul de sub termen: butonul de descarcare, si numai cand exista ce descarca.
 *
 * Conditia este `curent && areScan`, nu `areScan`: se descarca doar documentul curent, deci pe o
 * reinnoire din istoric butonul ar cere un fisier pe care serverul il refuza. Cand documentul exista
 * doar ca termen - cazul obisnuit, data se trece in back-office inaintea scanului - se spune asta,
 * in loc sa se ofere un buton care esueaza.
 */
function Scan({
  carId,
  type,
  doc,
  onUpload,
}: {
  carId: string;
  type: CarDocumentType;
  doc?: CarDocument;
  onUpload?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      await downloadCarDocument(carId, type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Documentul nu a putut fi descărcat.");
    } finally {
      setBusy(false);
    }
  }

  const note = !doc
    ? "Niciun document încărcat."
    : doc.hasScan
      ? null
      : "Termen fără document scanat.";

  return (
    <>
      {note && (
        <Text size="xs" c="dimmed" mt="xs">
          {note}
          {onUpload && (
            <>
              {" "}
              <UnstyledButton onClick={onUpload} style={{ verticalAlign: "baseline" }}>
                <Text component="span" size="xs" fw={700} c="brand.7" td="underline">
                  Încarcă
                </Text>
              </UnstyledButton>
            </>
          )}
        </Text>
      )}

      {doc && canDownloadDoc(doc) && (
        <Group justify="space-between" wrap="nowrap" mt="xs" gap="xs">
          <Text size="xs" c="dimmed" truncate style={{ flex: 1, minWidth: 0 }}>
            {doc.fileName ?? "Document scanat"}
            {doc.sizeBytes != null && ` · ${formatBytes(doc.sizeBytes)}`}
          </Text>
          <Button size="compact-sm" variant="default" loading={busy} onClick={download}>
            ⬇ Descarcă
          </Button>
        </Group>
      )}

      {error && (
        <Alert color="red" variant="light" py="xs" mt="xs">
          {error}
        </Alert>
      )}
    </>
  );
}
