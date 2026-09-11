import { useMemo, useState } from "react";
import { Alert, Button, Modal, NumberInput, Select, Stack, Text } from "@mantine/core";
// Componenta exista **numai in modul demo**: adaugarea de alimentari din frontend a fost anulata
// prin planul de API. De aceea citeste direct din `data.ts`, fara sa treaca prin facada - nu are
// corespondent pe backend. Se sterge odata cu modul demo.
import { addTransaction, cars as allCars, stations } from "~/lib/data";
import { FUEL_LABEL, type FuelType } from "~/lib/fleet";
import type { Session } from "~/lib/auth";

const FUELS = (["benzina", "motorina"] as FuelType[]).map((v) => ({
  value: v,
  label: FUEL_LABEL[v],
}));

export function TransactionForm({
  session,
  opened,
  onClose,
  onAdded,
}: {
  session: Session;
  opened: boolean;
  onClose: () => void;
  onAdded?: () => void;
}) {
  // Un sofer inregistreaza doar pe masinile lui, un manager pe oricare.
  const selectableCars = useMemo(
    () =>
      session.role === "driver"
        ? allCars.filter((c) => c.driverId === session.driverId)
        : allCars,
    [session.role, session.driverId],
  );

  const initialCar = selectableCars[0] ?? allCars[0];

  const [carId, setCarId] = useState<string>(initialCar?.id ?? "");
  const [stationId, setStationId] = useState<string>(stations[0]?.id ?? "");
  const [fuel, setFuel] = useState<FuelType>(initialCar?.fuel ?? "benzina");
  const [liters, setLiters] = useState<number | "">(40);
  const [km, setKm] = useState<number | "">(300);
  const [price, setPrice] = useState<number | "">(stations[0]?.dieselPrice ?? "");
  const [error, setError] = useState<string | null>(null);

  function priceAt(stationIdValue: string, fuelValue: FuelType) {
    const st = stations.find((s) => s.id === stationIdValue);
    if (!st) return "";
    return (fuelValue === "benzina" ? st.petrolPrice : st.dieselPrice) ?? "";
  }

  function onCarChange(value: string | null) {
    if (!value) return;
    setCarId(value);
    const car = allCars.find((c) => c.id === value);
    if (car?.fuel) {
      setFuel(car.fuel);
      setPrice(priceAt(stationId, car.fuel));
    }
  }

  function onStationChange(value: string | null) {
    if (!value) return;
    setStationId(value);
    setPrice(priceAt(value, fuel));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (liters === "" || Number(liters) <= 0) {
      setError("Introdu numărul de litri.");
      return;
    }
    if (km === "" || Number(km) < 0) {
      setError("Introdu kilometrii parcurși.");
      return;
    }
    if (price === "" || Number(price) <= 0) {
      setError("Introdu prețul pe litru.");
      return;
    }
    addTransaction({
      carId,
      stationId,
      fuel,
      liters: Number(liters),
      kmDriven: Number(km),
      pricePerLiter: Number(price),
    });
    setError(null);
    onAdded?.();
    onClose();
  }

  const total = liters !== "" && price !== "" ? (Number(liters) * Number(price)).toFixed(2) : "—";

  return (
    <Modal opened={opened} onClose={onClose} title="Alimentare nouă" centered radius="lg">
      <form onSubmit={submit}>
        <Stack gap="sm">
          <Select
            label="Mașina"
            data={selectableCars.map((c) => ({
              value: c.id,
              label: `${c.plate} · ${c.brand ?? ""} ${c.model ?? ""}`.trim(),
            }))}
            value={carId}
            onChange={onCarChange}
            allowDeselect={false}
            searchable
          />
          <Select
            label="Stația"
            data={stations.map((s) => ({ value: s.id, label: s.name }))}
            value={stationId}
            onChange={onStationChange}
            allowDeselect={false}
            searchable
          />
          <Select
            label="Combustibil"
            data={FUELS}
            value={fuel}
            onChange={(v) => {
              const next = (v as FuelType) ?? "benzina";
              setFuel(next);
              setPrice(priceAt(stationId, next));
            }}
            allowDeselect={false}
          />
          <NumberInput
            label="Litri"
            value={liters}
            onChange={(v) => setLiters(v === "" ? "" : Number(v))}
            min={1}
            decimalScale={1}
          />
          <NumberInput
            label="Preț pe litru (lei)"
            value={price}
            onChange={(v) => setPrice(v === "" ? "" : Number(v))}
            min={0}
            decimalScale={2}
          />
          <NumberInput
            label="Kilometri de la ultima alimentare"
            value={km}
            onChange={(v) => setKm(v === "" ? "" : Number(v))}
            min={0}
          />
          <Text size="sm" c="dimmed">
            Total: <strong>{total} lei</strong>
          </Text>
          {error && (
            <Alert color="red" variant="light" py="xs">
              {error}
            </Alert>
          )}
          <Button type="submit" fw={700}>
            Salvează alimentarea
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
