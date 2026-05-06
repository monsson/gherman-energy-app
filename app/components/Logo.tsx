import { Group, Stack, Text } from "@mantine/core";

type Props = { size?: number; tone?: "dark" | "light" };

export function Logo({ size = 56, tone = "dark" }: Props) {
  const stroke = tone === "dark" ? "#065f46" : "#ffffff";
  const fill = tone === "dark" ? "#10b981" : "#fbbf24";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Gherman Energy"
    >
      <defs>
        <linearGradient id="ge-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor={stroke} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#ge-grad)" />
      <path
        d="M22 18 L42 18 L42 26 L30 26 L30 32 L40 32 L40 40 L30 40 L30 46 L42 46 L42 52 L22 52 Z"
        fill={tone === "dark" ? "white" : "#065f46"}
      />
      <circle cx="48" cy="20" r="4" fill={tone === "dark" ? "#fbbf24" : "#10b981"} />
    </svg>
  );
}

export function LogoWordmark({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const main = tone === "dark" ? "brand.8" : "white";
  const sub = tone === "dark" ? "brand.6" : "brand.1";
  return (
    <Group gap="sm" wrap="nowrap">
      <Logo size={40} tone={tone} />
      <Stack gap={0}>
        <Text fw={800} c={main} size="md" lh={1.1}>
          Gherman Energy
        </Text>
        <Text
          size="10px"
          fw={600}
          c={sub}
          tt="uppercase"
          style={{ letterSpacing: "0.16em" }}
        >
          Fleet & Drivers
        </Text>
      </Stack>
    </Group>
  );
}
