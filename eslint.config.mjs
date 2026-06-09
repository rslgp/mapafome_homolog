import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // ── @next/next/no-img-element: OFF (project-wide, deliberate) ──────────────
    //
    // This rule pushes <img> → next/image for its LCP/bandwidth optimization.
    // That optimizer is DISABLED globally in this project's next.config.mjs:
    //   output: 'export'        → static HTML export, no Next image server
    //   images: { unoptimized: true } → next/image emits an essentially-plain <img>
    //
    // So next/image delivers ZERO optimization here while ADDING layout risk
    // (it requires width+height/fill and injects wrapper/inline styling that can
    // shift baselines and box sizing). A migration would be pure churn at real
    // visual-regression cost. The rule is wholesale inapplicable to THIS project,
    // not site-by-site — every <img> is exempt for the same structural reason:
    //   • InfoPanel.js     — remote CDN logos (wikimedia/telegram/play/gov.br/
    //                        github/globo); remote+unoptimized = no benefit.
    //   • PopupContent.js  — rendered into a Leaflet popup as a static HTML string
    //                        OUTSIDE the React reconciler; next/image cannot mount.
    //   • ImagemInstagram  — base64 data: URI; unoptimizable by definition.
    //   • svgHelper.js     — SVG via data-URI/blob src; dynamic, unoptimizable.
    //   • imprensa/page.js — plain <img> chosen deliberately for output:'export'.
    //   • header/SponsorSlot/MainControls/InstallToast — local/CSS-sized or
    //                        dynamic-src icons; conversion only risks baseline/box
    //                        shift for no optimization payoff under unoptimized.
    //
    // Encoding this as ~24 inline disables would scatter one structural fact into
    // 24 drifting copies and mis-signal that each site is individually special.
    // One source of truth, stated where it is actually true, is the honest call.
    // REVISIT: if next.config ever drops output:'export' or sets unoptimized:false,
    // remove this block and migrate to next/image where it then earns its benefit.
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
