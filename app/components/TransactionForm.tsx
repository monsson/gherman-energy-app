import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import {
  addTransaction,
  cars as allCars,
  drivers,
  driverForCar,
  type FuelType,
  stations,
} from "~/lib/data";
import type { Session } from "~/lib/auth";

const FUELS: FuelType[] = ["Benzină", "Motorină"];

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
  // A driver may only register a fuel-up for their own car; a manager for any.
  const selectableCars = useMemo(
    () =>
      session.role === "driver"
        ? allCars.filter((c) => c.driverId === session.driverId)
        : allCars,
    [session.role, session.driverId],
  );

  const initialCarId = selectableCars[0]?.id ?? allCars[0]?.id ?? 0;

  const [carId, setCarId] = useState<number>(initialCarId);
  // Card is auto-linked to the car's driver but stays editable.
  const [driverId, setDriverId] = useState<number>(
    driverForCar(initialCarId)?.id ?? drivers[0]?.id ?? 0,
  );
  const [cardTouched, setCardTouched] = useState(false);
  const [stationId, setStationId] = useState<number>(stations[0]?.id ?? 0);
  const [fuel, setFuel] = useState<FuelType>(
    allCars.find((c) => c.id === initialCarId)?.fuel ?? "Benzină",
  );
  const [liters, setLiters] = useState<number | "">(40);
  const [km, setKm] = useState<number | "">(300);
  const [price, setPrice] = useState<number | "">(() => {
    const st = stations[0];
    return st ? st.dieselPrice : "";
  });
  const [error, setError] = useState<string | null>(null);

  function onCarChange(value: string | null) {
    const id = Number(value);
    setCarId(id);
    const car = allCars.find((c) => c.id === id);
    if (car) {
      setFuel(car.fuel);
      // Re-derive the card from the car unless the user picked one manually.
      if (!cardTouched) {
        const d = driverForCar(id);
        if (d) setDriverId(d.id);
      }
      const st = stations.find((s) => s.id === stationId);
      if (st) setPrice(car.fuel === "Benzină" ? st.petrolPrice : st.dieselPrice);
    }
  }

  function onStationChange(value: string | null) {
    const id = Number(value);
    setStationId(id);
    const st = stations.find((s) => s.id === id);
    if (st) setPrice(fuel === "Benzină" ? st.petrolPrice : st.dieselPrice);
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
      driverId,
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

  const total =
    liters !== "" && price !== ""
      ? (Number(liters) * Number(price)).toFixed(2)
      : "—";

  return (
    <Modal opened={opened} onClose={onClose} title="Alimentare nouă" centered radius="lg">
      <form onSubmit={submit}>
        <Stack gap="sm">
          <Select
            label="Mașina"
            data={selectableCars.map((c) => ({
              value: String(c.id),
              label: `${c.brand} ${c.model} · ${c.plate}`,
            }))}
            value={String(carId)}
            onChange={onCarChange}
            allowDeselect={false}
            searchable
          />
          <Select
            label="Card (șofer)"
            description="Asociat automat mașinii; poate fi schimbat"
            data={drivers.map((d) => ({
              value: String(d.id),
              label: `•••• ${d.cardNumber} · ${d.name}`,
            }))}
            value={String(driverId)}
            onChange={(v) => {
              setCardTouched(true);
              setDriverId(Number(v));
            }}
            allowDeselect={false}
            searchable
          />
          <Select
            label="Stație"
            data={stations.map((s) => ({ value: String(s.id), label: s.name }))}
            value={String(stationId)}
            onChange={onStationChange}
            allowDeselect={false}
            searchable
          />
          <Select
            label="Combustibil"
            data={FUELS}
            value={fuel}
            onChange={(v) => setFuel((v as FuelType) ?? "Benzină")}
            allowDeselect={false}
          />
          <NumberInput
            label="Litri"
            value={liters}
            onChange={(v) => setLiters(v === "" ? "" : Number(v))}
            min={0}
            step={0.1}
            decimalScale={1}
            suffix=" L"
          />
          <NumberInput
            label="Kilometri parcurși"
            description="De la alimentarea anterioară"
            value={km}
            onChange={(v) => setKm(v === "" ? "" : Number(v))}
            min={0}
            suffix=" km"
          />
          <NumberInput
            label="Preț pe litru"
            value={price}
            onChange={(v) => setPrice(v === "" ? "" : Number(v))}
            min={0}
            step={0.01}
            decimalScale={2}
            suffix=" lei"
          />
          <Text size="sm" c="dimmed">
            Total estimat: <strong>{total} lei</strong>
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
