import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Testes ficam ao lado do código (*.test.ts) em packages e apps.
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    environment: "node",
    globals: true,
  },
});
