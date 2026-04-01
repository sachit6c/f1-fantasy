import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    // Exclude Playwright e2e tests — they are run separately via `npm run test:e2e`
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Unit tests cover pure business logic in lib/ and views/.
      include: ['lib/**/*.js', 'views/**/*.js'],
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
