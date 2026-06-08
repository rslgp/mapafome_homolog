import { defineConfig } from 'vitest/config';

// VM0 — Vitest scaffolding (LLM_BRAIN/v5_milestones.yaml § vm0_test_scaffolding).
//
// Uses jsdom so React Testing Library can render components. No Next.js
// integration — we test units, not the framework. Coverage thresholds are
// gating per v5 § critical_metrics.testing.coverage (70-80% branch).
export default defineConfig({
    // Source files in this repo are .js but contain JSX (Next.js convention).
    // Vitest 4 transforms via Oxc, not esbuild. Oxc's default include is
    // /\.(m?ts|[jt]sx)$/ with exclude /\.js$/, so .js files are skipped and
    // their JSX never parses ("Unexpected JSX expression"). The legacy
    // `esbuild` option is silently ignored under Oxc (Vite logs a warning).
    // Configure Oxc directly: widen `include` to cover .js, drop the .js
    // exclude, and force `lang: 'jsx'` (the extension-derived lang for .js is
    // "js", which disables JSX parsing). This lets React component tests and
    // mapComponents.js compile cleanly.
    oxc: {
        lang: 'jsx',
        jsx: { runtime: 'automatic' },
        include: /\.[jt]sx?$/,
        exclude: /node_modules/,
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
