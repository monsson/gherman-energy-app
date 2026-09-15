import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import { basePath } from "./base-path";

export default defineConfig({
  base: basePath,
  plugins: [reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
});
