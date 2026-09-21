/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Radacina backendului CUBA, ex. `https://gp.exemplu.ro/app`. Nesetat = mod demo. */
  readonly VITE_API_BASE_URL?: string;
  /** `cuba.rest.client.id` din web-app.properties. */
  readonly VITE_API_CLIENT_ID?: string;
  /** `cuba.rest.client.secret` din web-app.properties (fara prefixul `{noop}`). */
  readonly VITE_API_CLIENT_SECRET?: string;
  /**
   * De unde se incarca videoclipurile ghidului (`<url>/<capitol>.<limba>.mp4`). Nesetat =
   * `guide/` de langa `index.html`, adica `BASE_URL + "guide/"`.
   */
  readonly VITE_GUIDE_MEDIA_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
