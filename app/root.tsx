import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
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
    { name: "theme-color", content: "#047857" },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1"
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
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
    <main className="min-h-screen p-6 flex flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-3xl font-bold">{message}</h1>
      <p className="text-slate-600">{details}</p>
      {stack && (
        <pre className="w-full max-w-2xl mt-4 p-4 bg-slate-900 text-slate-100 text-xs rounded-lg overflow-x-auto text-left">
          <code>{stack}</code>
        </pre>
      )}
      <a
        href="./"
        className="mt-4 inline-block px-5 py-2 bg-brand-600 text-white rounded-lg font-semibold"
      >
        Înapoi la login
      </a>
    </main>
  );
}
