import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    // `src/native` is excluded rather than the other three being listed:
    // running it would need a React Native runtime, and a shimmed one would be
    // testing the shim. `src/packaging.test.ts` sits at the root and reads both
    // renderers as text, which is how the cross-platform contract is checked.
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/native/**", "**/node_modules/**"],
  },
});
