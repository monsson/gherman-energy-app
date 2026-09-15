import { loadEnv } from "vite";

// Subpath the app is served from, with leading and trailing slash ("/pwa/", or "/" at the root).
// Both `base` in vite.config.ts and `basename` in react-router.config.ts read this, so the two
// cannot drift apart.
//
// Set BASE_PATH in .env for a machine that always builds for the same target, or pass it per
// build (`env BASE_PATH=/pwa/ npm run build`) — a real env var wins over the .env file.
//
// loadEnv is what reads the .env file: Vite only exposes VITE_-prefixed vars to the browser, and
// it never copies .env into process.env, so a plain `process.env.BASE_PATH` would silently miss
// the .env value and build the default path instead. The "" prefix lifts the VITE_ filter; the
// value is only read here, never handed to the client bundle.
const mode = process.env.NODE_ENV === "development" ? "development" : "production";
const raw = loadEnv(mode, process.cwd(), "").BASE_PATH ?? "/gherman-energy-app/";
const trimmed = raw.replace(/^\/+|\/+$/g, "");

export const basePath = trimmed === "" ? "/" : `/${trimmed}/`;
