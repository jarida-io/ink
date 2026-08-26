import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    // The native renderer is checked by `tsconfig.native.json`, not here:
    // running it would need a React Native runtime, and a shimmed one would be
    // testing the shim.
    include: ["src/{tokens,core,web}/**/*.test.{ts,tsx}"],
  },
});
