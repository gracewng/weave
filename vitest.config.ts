import { defineConfig } from 'vitest/config';

// Tests are Devin-owned (*.test.ts). They live next to the code they test.
export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts', 'scripts/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**'],
    passWithNoTests: true,
  },
});
