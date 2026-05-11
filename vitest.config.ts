import { defineConfig } from "vitest/config";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

const pkg = (name: string) =>
  resolve(__dirname, "packages", name, "src", "index.ts");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@cognitive-forge/core":         pkg("core"),
      "@cognitive-forge/casepack":     pkg("casepack"),
      "@cognitive-forge/domain-packs": pkg("domain-packs"),
      "@cognitive-forge/runtime":      pkg("runtime"),
      "@cognitive-forge/bridge":       pkg("bridge"),
      "@cognitive-forge/ui-forge":     pkg("ui-forge"),
      "@cognitive-forge/validation":   pkg("validation"),
    },
  },
  test: {
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "packages/**/src/**/*.test.ts",
      "packages/**/src/**/*.test.tsx",
    ],
    globals: true,
    environment: "node",
    environmentMatchGlobs: [
      // ui-forge component tests need jsdom
      ["tests/unit/ui-forge/**", "jsdom"],
    ],
    reporters: ["verbose"],
    setupFiles: ["./tests/unit/ui-forge/setup.ts"],
  },
});
