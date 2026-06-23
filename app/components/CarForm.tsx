import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import {
  addCar,
  type Car,
  drivers,
  type FuelType,
  updateCar,
} from "~/lib/data";

const FUELS: FuelType[] = ["Benzină", "Motorină"];
const SEGMENTS = [
  { value: "small", label: "Autoturism mic" },
  { value: "utility", label: "Utilitară" },
];

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type FormState = {
  plate: string;
  brand: string;
  model: string;
  year: number | "";
  segment: Car["segment"];
  fuel: FuelType;
  driverId: number;
  itp: string;
  rca: string;
  rovigneta: string;
};

function fromCar(car: Car): FormState {
  return {
    plate: car.plate,
    brand: car.brand,
    model: car.model,
    year: car.year,
    segment: car.segment,
    fuel: car.fuel,
    driverId: car.driverId,
    itp: car.itp,
    rca: car.rca,
    rovigneta: car.rovigneta,
  };
}

function blank(): FormState {
  return {
    plate: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    segment: "small",
    fuel: "Benzină",
    driverId: drivers[0]?.id ?? 0,
    itp: todayPlus(365),
    rca: todayPlus(365),
    rovigneta: todayPlus(365),
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
  car?: Car; // present → edit, absent → create
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => (car ? fromCar(car) : blank()));
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the modal is (re)opened for a different car.
  useEffect(() => {
    if (opened) {
      setForm(car ? fromCar(car) : blank());
      setError(null);
    }
  }, [opened, car]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.plate.trim() || !form.brand.trim() || !form.model.trim()) {
      setError("Completează numărul, marca și modelul.");
      return;
    }
    if (form.year === "") {
      setError("Completează anul fabricației.");
      return;
    }
    const payload = {
      plate: form.plate.trim().toUpperCase(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      segment: form.segment,
      fuel: form.fuel,
      driverId: form.driverId,
      itp: form.itp,
      rca: form.rca,
      rovigneta: form.rovigneta,
    };
    if (car) updateCar(car.id, payload);
    else addCar(payload);
    setError(null);
    onSaved?.();
    onClose();
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
            placeholder="CT-12-ABC"
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
              value={form.segment}
              onChange={(v) => set("segment", (v as Car["segment"]) ?? "small")}
              allowDeselect={false}
            />
          </Group>
          <Group grow>
            <Select
              label="Combustibil"
              data={FUELS}
              value={form.fuel}
              onChange={(v) => set("fuel", (v as FuelType) ?? "Benzină")}
              allowDeselect={false}
            />
            <Select
              label="Șofer asignat"
              data={drivers.map((d) => ({ value: String(d.id), label: d.name }))}
              value={String(form.driverId)}
              onChange={(v) => set("driverId", Number(v))}
              allowDeselect={false}
              searchable
            />
          </Group>
          <TextInput
            label="ITP valabil până la"
            type="date"
            value={form.itp}
            onChange={(e) => set("itp", e.currentTarget.value)}
          />
          <Group grow>
            <TextInput
              label="RCA"
              type="date"
              value={form.rca}
              onChange={(e) => set("rca", e.currentTarget.value)}
            />
            <TextInput
              label="Rovignetă"
              type="date"
              value={form.rovigneta}
              onChange={(e) => set("rovigneta", e.currentTarget.value)}
            />
          </Group>
          {error && (
            <Alert color="red" variant="light" py="xs">
              {error}
            </Alert>
          )}
          <Button type="submit" fw={700}>
            {car ? "Salvează modificările" : "Adaugă mașina"}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
