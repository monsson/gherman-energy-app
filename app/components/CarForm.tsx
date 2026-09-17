import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  type Car,
  type CarInput,
  FUEL_LABEL,
  type FuelType,
  listDrivers,
  saveCar,
  type Segment,
  SEGMENT_LABEL,
} from "~/lib/fleet";
import { useResource } from "~/lib/useResource";

// Valorile sunt id-urile din backend (`SegmentAuto`, `TipCarburant`); eticheta romaneasca este
// treaba frontendului. GPL nu intra: exista in alimentari, nu in nomenclatorul de masini.
const SEGMENTS = (["mica", "autoutilitara"] as Segment[]).map((v) => ({
  value: v,
  label: SEGMENT_LABEL[v],
}));
const FUELS = (["benzina", "motorina"] as FuelType[]).map((v) => ({
  value: v,
  label: FUEL_LABEL[v],
}));

type FormState = {
  plate: string;
  brand: string;
  model: string;
  year: number | "";
  segment: Segment | "";
  fuel: FuelType | "";
  driverId: string;
};

function fromCar(car: Car): FormState {
  return {
    plate: car.plate,
    brand: car.brand ?? "",
    model: car.model ?? "",
    year: car.year ?? "",
    segment: car.segment ?? "",
    fuel: car.fuel ?? "",
    driverId: car.driverId ?? "",
  };
}

function blank(): FormState {
  return {
    plate: "",
    brand: "",
    model: "",
    year: "",
    segment: "",
    fuel: "",
    driverId: "",
  };
}

export function CarForm({
  opened,
  onClose,
  car,
  onSaved,
}: {
  opened: boolean;
  onClose: () => void;
  car?: Car; // prezent → editare, absent → creare
  onSaved?: (saved: Car) => void;
}) {
  const [form, setForm] = useState<FormState>(() => (car ? fromCar(car) : blank()));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const drivers = useResource(() => listDrivers(), [opened]);

  // Formul se reaseaza de fiecare data cand modalul se deschide pentru alta masina.
  useEffect(() => {
    if (opened) {
      setForm(car ? fromCar(car) : blank());
      setError(null);
    }
  }, [opened, car]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Backendul refuza aceleasi trei campuri; verificarea locala scuteste drumul.
    if (!form.plate.trim() || !form.brand.trim() || !form.model.trim()) {
      setError("Completează numărul, marca și modelul.");
      return;
    }

    const payload: CarInput = {
      id: car?.id,
      plate: form.plate.trim().toUpperCase(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: form.year === "" ? undefined : Number(form.year),
      segment: form.segment || undefined,
      fuel: form.fuel || undefined,
      driverId: form.driverId || undefined,
    };

    setBusy(true);
    try {
      const saved = await saveCar(payload);
      setError(null);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      // Mesajul vine de la server, scris pentru utilizator: numar deja folosit, sofer din alt
      // partener, rol fara drept de scriere.
      setError(err instanceof Error ? err.message : "Mașina nu a putut fi salvată.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={car ? "Editează mașina" : "Mașină nouă"}
      centered
      radius="lg"
    >
      <form onSubmit={submit}>
        <Stack gap="sm">
          <TextInput
            label="Număr înmatriculare"
            placeholder="CT12ABC"
            value={form.plate}
            onChange={(e) => set("plate", e.currentTarget.value)}
            required
          />
          <Group grow>
            <TextInput
              label="Marca"
              placeholder="Dacia"
              value={form.brand}
              onChange={(e) => set("brand", e.currentTarget.value)}
              required
            />
            <TextInput
              label="Model"
              placeholder="Logan"
              value={form.model}
              onChange={(e) => set("model", e.currentTarget.value)}
              required
            />
          </Group>
          <Group grow>
            <NumberInput
              label="An fabricație"
              value={form.year}
              onChange={(v) => set("year", v === "" ? "" : Number(v))}
              min={1990}
              max={new Date().getFullYear() + 1}
            />
            <Select
              label="Segment"
              data={SEGMENTS}
              value={form.segment || null}
              onChange={(v) => set("segment", (v as Segment) ?? "")}
              placeholder="Necompletat"
              clearable
            />
          </Group>
          <Group grow>
            <Select
              label="Combustibil"
              data={FUELS}
              value={form.fuel || null}
              onChange={(v) => set("fuel", (v as FuelType) ?? "")}
              placeholder="Necompletat"
              clearable
            />
            <Select
              label="Șofer asignat"
              data={(drivers.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
              value={form.driverId || null}
              onChange={(v) => set("driverId", v ?? "")}
              placeholder={drivers.loading ? "Se încarcă…" : "Neasignat"}
              searchable
              clearable
            />
          </Group>
          {/* Termenele ITP / RCA / rovinieta nu mai sunt campuri pe masina: se deduc din documente
              si se schimba doar incarcand un scan, in sectiunea "Documente" a masinii. */}
          {car && (
            <Text size="xs" c="dimmed">
              Termenele ITP, RCA și rovinietă vin din documentele mașinii. Se schimbă încărcând
              documentul, în secțiunea <b>Documente</b>.
            </Text>
          )}
          {error && (
            <Alert color="red" variant="light" py="xs">
              {error}
            </Alert>
          )}
          <Button type="submit" fw={700} loading={busy}>
            {car ? "Salvează modificările" : "Adaugă mașina"}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
