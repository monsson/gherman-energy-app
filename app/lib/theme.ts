import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Brand palette: shades of #FAB516. Index 6 is the default primary shade.
const brand: MantineColorsTuple = [
  "#fff8e1",
  "#feedb6",
  "#fde388",
  "#fcd55b",
  "#fbc93b",
  "#fbc020",
  "#fab516",
  "#d9970c",
  "#a87308",
  "#785204",
];

// Neutral dark palette: shades of #1D1D1D. Used for headers, accents, and
// high-contrast surfaces where white text needs a dark background.
const dark: MantineColorsTuple = [
  "#f5f5f5",
  "#e0e0e0",
  "#c2c2c2",
  "#9e9e9e",
  "#757575",
  "#5e5e5e",
  "#404040",
  "#2d2d2d",
  "#1d1d1d",
  "#0e0e0e",
];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 5 },
  colors: { brand, dark },
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  headings: {
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: "800",
  },
  defaultRadius: "lg",
});
