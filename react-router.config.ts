import type { Config } from "@react-router/dev/config";
import { basePath } from "./base-path";

export default {
  ssr: false,
  basename: basePath,
} satisfies Config;
