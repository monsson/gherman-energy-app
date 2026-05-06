import { Link, NavLink, useNavigate } from "react-router";
import {
  ActionIcon,
  Box,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { LogoWordmark } from "./Logo";
import { logout, type Session } from "~/lib/auth";

type NavItem = { to: string; label: string; icon: React.ReactNode };

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={22} height={22}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  cars: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={22} height={22}>
      <path d="M5 17h14M6 17v2M18 17v2" />
      <path d="M5 17l1.5-5.5A2 2 0 0 1 8.4 10h7.2a2 2 0 0 1 1.9 1.5L19 17" />
      <circle cx="8" cy="17" r="1.5" />
      <circle cx="16" cy="17" r="1.5" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={22} height={22}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={22} height={22}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6" />
    </svg>
  ),
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" width={22} height={22}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  ),
};

const MANAGER_NAV: NavItem[] = [
  { to: "/manager", label: "Acasă", icon: ICONS.home },
  { to: "/manager/cars", label: "Mașini", icon: ICONS.cars },
  { to: "/manager/transactions", label: "Tranzacții", icon: ICONS.list },
];

const DRIVER_NAV: NavItem[] = [{ to: "/driver", label: "Acasă", icon: ICONS.home }];

export function AppShell({
  session,
  title,
  back,
  children,
}: {
  session: Session;
  title: string;
  back?: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const items = session.role === "manager" ? MANAGER_NAV : DRIVER_NAV;

  return (
    <Box mih="100dvh" pb={88} bg="gray.0">
      <Box
        component="header"
        pos="sticky"
        top={0}
        style={{
          zIndex: 50,
          background:
            "linear-gradient(135deg, var(--mantine-color-brand-7), var(--mantine-color-brand-6))",
          color: "white",
          boxShadow: "0 6px 20px rgba(4, 120, 87, 0.18)",
        }}
      >
        <Container size="sm" py="sm">
          <Group justify="space-between" wrap="nowrap" gap="sm">
            {back ? (
              <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                <ActionIcon
                  component={Link}
                  to={back}
                  variant="subtle"
                  color="gray.0"
                  size="lg"
                  aria-label="Înapoi"
                >
                  {ICONS.back}
                </ActionIcon>
                <Title order={3} c="white" lineClamp={1} style={{ flex: 1 }}>
                  {title}
                </Title>
              </Group>
            ) : (
              <LogoWordmark tone="light" />
            )}
            <Button
              size="xs"
              variant="white"
              color="brand.8"
              radius="md"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Ieșire
            </Button>
          </Group>
          {!back && (
            <Title order={2} c="white" mt="xs">
              {title}
            </Title>
          )}
        </Container>
      </Box>

      <Container size="sm" py="md" component="main">
        {children}
      </Container>

      <Box
        component="nav"
        pos="fixed"
        bottom={0}
        left={0}
        right={0}
        bg="white"
        style={{
          zIndex: 50,
          borderTop: "1px solid var(--mantine-color-gray-2)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <Container size="sm" px={0}>
          <Group gap={0} grow wrap="nowrap">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end
                style={({ isActive }) => ({
                  textDecoration: "none",
                  color: isActive
                    ? "var(--mantine-color-brand-7)"
                    : "var(--mantine-color-gray-6)",
                  padding: "10px 0",
                })}
              >
                <Stack gap={2} align="center" justify="center">
                  {it.icon}
                  <Text size="xs" fw={600}>
                    {it.label}
                  </Text>
                </Stack>
              </NavLink>
            ))}
            <Stack
              gap={2}
              align="center"
              justify="center"
              py="sm"
              c="gray.6"
              style={{ flex: 1 }}
            >
              {ICONS.user}
              <Text size="xs" fw={600} truncate maw={80}>
                {session.username}
              </Text>
            </Stack>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box mb="lg">
      <Group justify="space-between" align="center" mb="xs" px={4}>
        <Text size="xs" fw={700} tt="uppercase" c="gray.6" style={{ letterSpacing: "0.08em" }}>
          {title}
        </Text>
        {action}
      </Group>
      {children}
    </Box>
  );
}
