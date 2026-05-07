import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import {
  Button,
  ColorSchemeScript,
  Container,
  MantineProvider,
  mantineHtmlProps,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import type { Route } from "./+types/root";
import { theme } from "~/lib/theme";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  },
];

export function meta() {
  return [
    { title: "Gherman Energy — Fleet" },
    { name: "description", content: "Aplicație flotă & șoferi Gherman Energy" },
    { name: "theme-color", content: "#1d1d1d" },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" {...mantineHtmlProps}>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1"
        />
        <ColorSchemeScript defaultColorScheme="light" />
        <Meta />
        <Links />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="light">
          {children}
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Ceva n-a mers";
  let details = "A apărut o eroare neașteptată.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Eroare";
    details = error.status === 404 ? "Pagina nu a fost găsită." : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="md">
        <Title order={1}>{message}</Title>
        <Text c="dimmed" ta="center">
          {details}
        </Text>
        {stack && (
          <Text
            component="pre"
            ff="monospace"
            size="xs"
            p="md"
            bg="dark.8"
            c="gray.0"
            style={{ width: "100%", overflowX: "auto", borderRadius: 12 }}
          >
            {stack}
          </Text>
        )}
        <Button component="a" href="./" variant="filled">
          Înapoi la login
        </Button>
      </Stack>
    </Container>
  );
}
