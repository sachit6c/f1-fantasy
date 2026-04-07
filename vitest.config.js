import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    exclude: [
      '**/node_modules/**',
      'tests/e2e/**'  // Playwright E2E specs — run with `npx playwright test`
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Unit tests cover pure business logic in lib/.
      // View/component files require Chart.js + full DOM integration tests (separate effort).
      include: ['lib/**/*.js'],
      exclude: [
        'lib/world-map-paths.js', // static SVG data, no logic
        'lib/ergast-api.js',       // thin HTTP wrapper; covered by integration tests
        'lib/data-store.js'        // orchestration layer; covered by integration tests
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
