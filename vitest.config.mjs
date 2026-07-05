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
        // QA-01 — OOM-safe defaults. On this memory-constrained machine the default
        // threads pool crashes the run (worker teardown / STACK_BUFFER_OVERRUN
        // -1073740791) and the parallel file scheduling also triggers the flaky
        // vitest-axe "Axe is already running" false failure. Force the forks pool
        // and disable file parallelism so `vitest run` (and every caller, incl. CI
        // and commit-gate agents) is serial-and-safe WITHOUT needing the
        // --pool=forks --no-file-parallelism CLI flags every time. Trade-off:
        // slower wall-clock, but a green gate beats a fast crash. Pair with
        // NODE_OPTIONS=--max-old-space-size=6144 for the heap headroom.
        //
        // Vitest 4 note: fileParallelism:false forces maxWorkers=1 (fully serial) on
        // its own; poolOptions was REMOVED in v4 (its old { forks: { singleFork } }
        // shape is now redundant AND emits a deprecation warning), so these two
        // top-level options are the complete, warning-free config.
        pool: 'forks',
        fileParallelism: false,
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
                // PET-M5 — gate the /pets code that is unit-testable in jsdom:
                // the pure domain (petDomain), the data layer (petsData), the
                // marker-icon factory (petMarkerIcon), the offline queue
                // (petPublishQueue), and the two bottom-sheets (PetReportSheet /
                // PetDetailSheet, rendered via RTL).
                'src/app/pets/**',
            ],
            // PET-M5 — the pet files the milestone EXPLICITLY excludes from unit
            // coverage (jsdom can't render Leaflet; the route shell + roadmap YAML
            // are not source). Listing them keeps `src/app/pets/**` above as a
            // single, future-proof include (a new testable pet module gates
            // automatically) WITHOUT dragging the 70% threshold denominator down
            // with code that has no jsdom-reachable seam. Each exclusion names why.
            exclude: [
                'src/app/pets/PetMap.js',          // Leaflet map mount — excluded by PET-M5
                'src/app/pets/PetMarkers.js',      // Leaflet cluster layer — needs a live map
                'src/app/pets/PetSearchField.js',  // leaflet-geosearch control — needs a live map
                'src/app/pets/PetLocateControl.js',// Leaflet control — needs a live map
                'src/app/pets/PetsApp.js',         // top-level page; mounts PetMap (Leaflet) — e2e territory
                'src/app/pets/layout.js',          // Next route shell (metadata), not unit logic
                'src/app/pets/page.js',            // Next route entry (dynamic import), not unit logic
                // Non-source docs colocated with /pets — exclude so the v8 remap
                // does not try to parse them as JS (they emit a harmless parse
                // warning otherwise) and they never count toward coverage.
                'src/app/pets/**/*.yaml',          // PETS_MILESTONES.yaml — roadmap doc
                'src/app/pets/**/*.md',            // PET_CURVE.md / PET_PHOTO_STORAGE_SPIKE.md
                'src/app/pets/**/*.css',           // pets.css / petPalette.css — styles
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
