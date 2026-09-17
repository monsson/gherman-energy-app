// Insigna furnizorului de carburant, pe o alimentare sau pe un card.
//
// Culoarea este neutra intentionat: `brand` este galbenul Gherman Energy, iar teal / orange / red
// poarta in aplicatia asta stari (normal / avertisment / expirat). Furnizorul nu este o stare, deci
// nu imprumuta niciuna din ele - si nici culorile de marca ale furnizorilor, care ar intra in
// coliziune cu rosul de eroare.
//
// Fara furnizor nu se deseneaza nimic: pe carduri lipseste cand nu a fost completat in back-office,
// si un "Necunoscut" ar ocupa spatiu fara sa spuna nimic.

import { Badge, type BadgeProps } from "@mantine/core";
import { FUEL_SUPPLIER_LABEL, type FuelSupplier } from "~/lib/fleet";

type Props = Omit<BadgeProps, "children"> & { supplier?: FuelSupplier };

export function SupplierBadge({ supplier, ...props }: Props) {
  if (!supplier) return null;
  return (
    <Badge
      size="xs"
      radius="sm"
      variant="light"
      color="gray"
      tt="none"
      fw={600}
      style={{ flexShrink: 0 }}
      {...props}
    >
      {FUEL_SUPPLIER_LABEL[supplier]}
    </Badge>
  );
}
