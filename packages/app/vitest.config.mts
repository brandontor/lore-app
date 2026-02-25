import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [
      // Middleware uses Next.js edge runtime; jsdom replaces native Headers
      // which breaks NextResponse.next(). Run in node env instead.
      ['tests/unit/components/middleware.test.ts', 'node'],
    ],
    coverage: {
      provider: 'v8',
      include: [
        'lib/actions/**',
        'lib/queries/**',
        'context/**',
        'components/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
});
