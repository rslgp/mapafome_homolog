import { defineConfig } from 'vitest/config';

// VM0 — Vitest scaffolding (LLM_BRAIN/v5_milestones.yaml § vm0_test_scaffolding).
//
// Uses jsdom so React Testing Library can render components. No Next.js
// integration — we test units, not the framework. Coverage thresholds are
// gating per v5 § critical_metrics.testing.coverage (70-80% branch).
export default defineConfig({
    // Source files in this repo are .js but contain JSX (Next.js convention).
    // Vite's default esbuild loader treats .js as plain JS, so JSX inside
    // mapComponents.js / test files fails to parse. Tell esbuild to apply
    // the JSX loader to .js files too so React components compile cleanly.
    esbuild: {
        loader: 'jsx',
        include: /\.[jt]sx?$/,
        exclude: [],
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./test/setup.js'],
        include: ['test/**/*.test.{js,jsx,mjs}', 'src/**/*.test.{js,jsx,mjs}'],
        exclude: ['node_modules', '.next', 'out'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json-summary'],
            include: [
                'src/app/components/compatibility/components/googlesheets/**',
                'src/app/components/compatibility/components/ux/sponsors.js',
                'src/app/components/compatibility/components/ux/regionResolver.js',
            ],
            thresholds: {
                lines: 70,
                branches: 70,
                statements: 70,
                functions: 70,
            },
        },
    },
});
