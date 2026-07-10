// parceiros-planos.e2e.js — PLAN-SELECTION lane for /parceiros. @parceiros
//
// The /parceiros surface offers FIVE sponsorship tiers ("planos"), whose ids are
// the source of truth for selection logic + the mailto: payload (src/app/parceiros/
// page.js: TIER_IDS = ['bairro','cidade','estadual','nacional','contrapartida']).
// Each tier is a card with a choose button; picking one:
//   1. flips that card's button aria-pressed -> "true" and adds the
//      .mdf-parc__tier--selected class (and clears it from every other card),
//   2. syncs the form <select> to the same id,
//   3. is carried into the composed mailto: href, both in the subject "(<id>)" and
//      the body line "Tier de interesse: <id>".
//
// This lane asserts all three for EVERY tier, and for each tier captures a
// FULL-PAGE PNG screenshot of /parceiros in that selected state, then VERIFIES the
// PNG on disk (exists, PNG magic header, non-trivial byte size) so the run proves
// a real render landed, not a blank/zero-byte file. Screenshots are written
// deterministically (not only-on-failure) to test-results/parceiros-planos/ so the
// reproduce .bat can open them for a human to eyeball.
//
// Locale-agnostic on purpose: the visible tier LABELS change per locale, so the
// spec keys off the stable DOM contract (ids, card order, aria-pressed, the
// --selected class, and the mailto payload) rather than translated text — it
// passes whether NEXT_PUBLIC_INTL is on or off and whatever the active locale is.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// The tier ids in the exact card render order (page.js TIER_IDS). The spec is the
// browser-level mirror of that constant; if a tier is added/removed there, this
// list is the one line to update.
const TIER_IDS = ['bairro', 'cidade', 'estadual', 'nacional', 'contrapartida'];

// WHAT THE SPONSOR ACTUALLY RECEIVES per tier — the "entrega do plano". These are
// the four card fields (Território/Janela/Slots/Típico) + the reference price, and
// they are the CONTRACT the buyer reads before choosing. Values are the pt-BR
// source-of-truth verbatim (src/app/components/compatibility/components/ux/i18n/
// strings.page.js, keys page.partners.tier_<id>_{scope,window,slots,ref,who}, the
// `pt` block ~L407-436). If the SOT copy changes, this table must change with it —
// that is the POINT: the test fails the moment a plan silently stops delivering
// what it promised (e.g. slots count, coverage territory, or the campaign window).
// Kept as literal expectations (not imported) because the spec is CommonJS and the
// shard is an ESM `export const`; the file:key pointer above is the single SOT.
//
// NOTE: asserted only under the default pt-BR locale (the .bat + CI run with
// NEXT_PUBLIC_INTL unset). The dl-field PRESENCE checks below are locale-agnostic;
// the exact-value checks are guarded to pt-BR so a locale switch does not false-fail.
const TIER_DELIVERY = {
  bairro:        { scope: 'Raio ~3 km em torno do seu estabelecimento',        window: '1 mês',    slots: '1 placement',          ref: 'R$ 500',                       who: 'Pizzaria, restaurante local, farmácia de bairro, comércio de rua' },
  cidade:        { scope: 'Cidade inteira (ex.: João Pessoa, Campina Grande)', window: '3 meses',  slots: '2 placements',         ref: 'R$ 2.500',                     who: 'Rede regional, supermercado local, cooperativa, franquia' },
  estadual:      { scope: 'Paraíba inteira',                                   window: '6 meses',  slots: '3 placements',         ref: 'R$ 10.000',                    who: 'Distribuidora estadual, universidade, fundação regional' },
  nacional:      { scope: 'Brasil, todas as regiões atendidas',               window: '12 meses', slots: 'Todos os placements',  ref: 'R$ 30.000',                    who: 'Multinacional, fundação empresarial, banco' },
  contrapartida: { scope: 'Variável (produto ou serviço)',                    window: 'Variável', slots: 'Até 1 placement',      ref: 'Produto / serviço equivalente', who: 'Cestas básicas, fretes, horas de agência, hospedagem' },
};

// Deterministic screenshot sink (created fresh so a stale PNG never masquerades as
// this run's proof). Lives under test-results/ so it is gitignored like other
// Playwright artifacts and easy for the .bat to open.
const SHOT_DIR = path.join(__dirname, '..', '..', 'test-results', 'parceiros-planos');

test.beforeAll(() => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
});

// Selectors from the real DOM contract (src/app/parceiros/page.js):
//   each card:   article.mdf-parc__tier  (order === TIER_IDS order)
//   its button:  the <button> inside, carrying aria-pressed
//   selected:    article gains .mdf-parc__tier--selected
//   form select: <select> whose <option value="<id>"> mirrors the tier
//   CTA:         a.mdf-parc__cta with the mailto href (only when canSubmit)
const CARD = 'article.mdf-parc__tier';
const CTA = 'a.mdf-parc__cta';

// Cold-compile budget for the FIRST `next dev --webpack` hit + React hydration on a
// slow HDD. Measured in this repo: first-hit route compile alone was ~44s and React
// hydration lands after that. waitFor({visible}) only proves the SSR HTML painted —
// NOT that handlers are attached — so we need a separate, generous budget to wait
// for the page to become genuinely INTERACTIVE before any fill/click. (config's
// navigationMs is 45s for the same reason.)
const HYDRATION_MS = 90000;

// Navigate to /parceiros and wait until it is actually INTERACTIVE, not merely
// painted. This is a Next.js 'use client' component: under `next dev` on a cold HDD
// the route compiles slowly and React hydration completes well AFTER the SSR HTML is
// visible. A fill()/click() that fires in that window sets the DOM but is dropped by
// React (no listener yet) — the classic hydration race that made every tier test
// flake. So after the cards paint we run a real INTERACTIVITY PROBE keyed on the
// app's own reactive output, then reset it, so every downstream action runs on a
// hydrated page. No hard sleep — every wait is a web-first auto-retry. [pw best-practices]
async function gotoParceiros(page) {
  await page.goto('/parceiros', { waitUntil: 'domcontentloaded' });
  await page.locator(CARD).first().waitFor({ state: 'visible', timeout: HYDRATION_MS });
  // All five cards must be present — proves a real render, not the Next error shell.
  await expect(page.locator(CARD)).toHaveCount(TIER_IDS.length);

  // INTERACTIVITY PROBE: the CTA is aria-disabled until React state has BOTH empresa
  // AND email (canSubmit = empresa.trim() && email.trim()). While unhydrated it is
  // aria-disabled="true"; once React's onChange handlers are attached, filling both
  // required fields recomputes canSubmit and the CTA re-renders to aria-disabled=
  // "false". So: fill both required fields, wait for that flip (proves React ran and
  // the component is interactive), then clear both so fillRequired starts from a
  // clean, empty form. Retried as a unit so fills lost to the pre-hydration window
  // are simply re-sent until they land in React state.
  const emailInput = page.locator('input[type="email"]');
  const empresaInput = page.locator('.mdf-parc__grid input').first();
  const cta = page.locator(CTA);
  await expect(async () => {
    await emailInput.fill('probe@hydration.check');
    await empresaInput.fill('Probe Ltda');
    await expect(cta).toHaveAttribute('aria-disabled', 'false');
  }, 'page never became interactive (React hydration did not attach within budget)').toPass({ timeout: HYDRATION_MS });
  // Reset: empty both fields so the CTA is disabled again and the form is pristine
  // for the actual test body. (fillRequired re-fills both required fields from here.)
  await emailInput.fill('');
  await empresaInput.fill('');
  await expect(cta).toHaveAttribute('aria-disabled', 'true');
}

// Verify a written screenshot is a real, non-empty PNG (magic header 89 50 4E 47),
// not a zero-byte or truncated file. Returns the byte size for logging.
function verifyPng(file) {
  expect(fs.existsSync(file), `screenshot not written: ${file}`).toBe(true);
  const buf = fs.readFileSync(file);
  // A full-page /parceiros PNG is comfortably > 3 KB; a blank/broken capture is
  // far smaller. Guard against a "green" run that silently produced an empty file.
  expect(buf.length, `screenshot suspiciously small (${buf.length} bytes): ${file}`).toBeGreaterThan(3000);
  const isPng =
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a;
  expect(isPng, `file is not a valid PNG (bad magic header): ${file}`).toBe(true);
  return buf.length;
}

test.describe('parceiros: every plan is selectable + verified via PNG @parceiros', () => {
  // Raise the per-test timeout above the shared config's 60s: the FIRST test to hit
  // /parceiros pays the full cold `next dev --webpack` route compile (~44s measured)
  // PLUS hydration, the interactivity probe, the fills, the tier click, and a
  // full-page screenshot. 60s is not enough headroom for that first cold test on a
  // slow HDD; 150s is. Warm subsequent tests finish in seconds and are unaffected.
  // This only widens the safety budget — it weakens no assertion.
  test.setTimeout(150000);

  // Fill the two required fields (company + email) up front so the CTA is enabled
  // and its mailto href is composed — that is where the tier lands in the payload.
  // canSubmit = empresa.trim() && email.trim() (page.js).
  //
  // HYDRATION-SAFE FILL — and WHY the naive "fill then toHaveValue" is NOT enough:
  // Playwright's fill() writes the input's DOM .value directly and fires an `input`
  // event. Under `next dev` on a cold HDD the client component may not be hydrated
  // yet, so React's onChange handler is not attached — the DOM .value is set (so a
  // `toHaveValue` check PASSES) while React's `empresa`/`email` state stays ''. The
  // retry loop is then satisfied by the DOM and never re-fills, but `canSubmit`
  // (which reads REACT state, not the DOM) is still false, so the CTA never gets a
  // mailto href and the payload assertions fail. Confirmed via the failure page
  // snapshot: both inputs showed their typed values yet the CTA `<a>` had no href.
  //
  // So the retry must key off an APP-OBSERVABLE signal that React actually captured
  // the input, not the DOM property fill() set itself. That signal is the CTA
  // gaining a `mailto:` href — it composes only once React's empresa+email state is
  // non-empty (canSubmit). We re-fill both fields until the CTA link appears or the
  // expect timeout elapses. fill() is idempotent (re-typing the same value is safe),
  // so once handlers are live the last fill sticks in React state. No hard sleep;
  // .toPass() is the auto-retry primitive that replaces a waitForTimeout hydration
  // crutch. [pw best-practices, locators]
  async function fillRequired(page) {
    // Field order in the grid: company is the FIRST text input; email is type=email.
    const emailInput = page.locator('input[type="email"]');
    // The company input is the first <input> without a type=email; target by its
    // position as the first text input in the form grid.
    const empresaInput = page.locator('.mdf-parc__grid input').first();
    const cta = page.locator(CTA);

    await expect(async () => {
      await emailInput.fill('parceiro@empresa.com');
      await empresaInput.fill('Empresa Teste LTDA');
      // App-observable proof React captured the fills: canSubmit flipped true, so
      // the CTA is now an enabled link with a composed mailto href (not the bare,
      // href-less anchor React renders while the form is not submittable).
      await expect(cta).toHaveAttribute('href', /^mailto:/);
    }).toPass({ timeout: 20000 });

    // Belt-and-braces: the DOM inputs also reflect the typed values (guards against
    // a future refactor that decouples the CTA href from these two fields).
    await expect(empresaInput).toHaveValue('Empresa Teste LTDA');
    await expect(emailInput).toHaveValue('parceiro@empresa.com');
  }

  for (let i = 0; i < TIER_IDS.length; i++) {
    const id = TIER_IDS[i];
    test(`tier "${id}" delivers its contract (scope/window/slots/ref), selects, syncs the form + mailto, renders (PNG verified)`, async ({ page }) => {
      await gotoParceiros(page);
      await fillRequired(page);

      // The card for THIS tier is the i-th card (render order === TIER_IDS order).
      const card = page.locator(CARD).nth(i);
      const chooseBtn = card.locator('button');

      // Pick the tier.
      //
      // HYDRATION-SAFE SELECTION: the first click can land on the still-SSR'd DOM
      // before React attaches setTier(id) as the button's onClick, so it no-ops and
      // aria-pressed stays "false". Wrap click+assert in a web-first auto-retry: if
      // the state did not flip, click again until it does or the expect timeout
      // elapses. This is safe because setTier(id) is IDEMPOTENT — re-clicking the
      // same (already-selected) tier keeps it selected — so an extra click after
      // hydration cannot corrupt state. No hard sleep; .toPass() is the auto-retry
      // primitive that replaces a waitForTimeout hydration crutch. [pw best-practices]
      await expect(async () => {
        await chooseBtn.click();
        await expect(chooseBtn).toHaveAttribute('aria-pressed', 'true');
      }, `tier ${id}: choose button never became aria-pressed after retried clicks (hydration?)`).toPass({ timeout: 20000 });

      // (1) This card's button is pressed and the card carries the --selected class.
      await expect(chooseBtn, `tier ${id}: choose button not aria-pressed`).toHaveAttribute('aria-pressed', 'true');
      await expect(card, `tier ${id}: card missing --selected class`).toHaveClass(/mdf-parc__tier--selected/);

      // (1b) EXACTLY one card is selected — picking this tier cleared the others.
      await expect(
        page.locator(`${CARD}.mdf-parc__tier--selected`),
        `tier ${id}: more than one card selected`,
      ).toHaveCount(1);
      await expect(
        page.locator(`${CARD} button[aria-pressed="true"]`),
        `tier ${id}: more than one choose button pressed`,
      ).toHaveCount(1);

      // (1c) DELIVERY: the card exposes EVERYTHING the sponsor is buying — the four
      // contract fields (Território / Janela / Slots / Típico) rendered as a <dl> of
      // four dt/dd pairs in the fixed order scope, window, slots, who (page.js
      // L122-126), plus the reference price in the header. First assert PRESENCE
      // (locale-agnostic: every field is non-empty so no plan ships a blank promise),
      // then assert the EXACT pt-BR values (the real contract text) so a silent copy
      // regression — wrong slot count, shrunk coverage, dropped window — fails here.
      const dts = card.locator('dl dt');
      const dds = card.locator('dl dd');
      await expect(dts, `tier ${id}: expected 4 contract fields (dt)`).toHaveCount(4);
      await expect(dds, `tier ${id}: expected 4 contract values (dd)`).toHaveCount(4);
      const ref = card.locator('.mdf-parc__tier-ref');
      // PRESENCE: none of the delivered values is empty (any locale).
      for (let d = 0; d < 4; d++) {
        const val = ((await dds.nth(d).innerText()) || '').trim();
        expect(val.length, `tier ${id}: contract field #${d} (scope/window/slots/who) is empty`).toBeGreaterThan(0);
      }
      expect(((await ref.innerText()) || '').trim().length, `tier ${id}: reference price is empty`).toBeGreaterThan(0);

      // EXACT VALUES (pt-BR default only): dd order is scope, window, slots, who.
      // Detect pt-BR by the bairro tier's known reference price so an INTL locale
      // switch does not false-fail the exact-text checks; the presence checks above
      // still cover the localized render.
      const isPtBr = ((await page.locator(`${CARD}`).nth(0).locator('.mdf-parc__tier-ref').innerText()) || '').includes('R$ 500');
      if (isPtBr) {
        const want = TIER_DELIVERY[id];
        await expect(dds.nth(0), `tier ${id}: Território (scope) mismatch`).toHaveText(want.scope);
        await expect(dds.nth(1), `tier ${id}: Janela (window) mismatch`).toHaveText(want.window);
        await expect(dds.nth(2), `tier ${id}: Slots mismatch — sponsor would not get the promised placements`).toHaveText(want.slots);
        await expect(dds.nth(3), `tier ${id}: Típico (who) mismatch`).toHaveText(want.who);
        await expect(ref, `tier ${id}: reference price mismatch`).toHaveText(want.ref);
      }

      // (2) The form <select> synced to the same id.
      await expect(page.locator('.mdf-parc__grid select'), `tier ${id}: form select did not sync`).toHaveValue(id);

      // (3) The composed mailto: href carries this tier in BOTH the subject and body.
      const href = await page.locator(CTA).getAttribute('href');
      expect(href, `tier ${id}: CTA has no mailto href (form not submittable?)`).toBeTruthy();
      expect(href.startsWith('mailto:'), `tier ${id}: CTA href is not a mailto`).toBe(true);
      const decoded = decodeURIComponent(href);
      // Subject: "Interesse em patrocínio — <empresa> (<tier>)"
      expect(decoded, `tier ${id}: mailto subject missing "(${id})"`).toContain(`(${id})`);
      // Body line: "Tier de interesse: <tier>"
      expect(decoded, `tier ${id}: mailto body missing tier line`).toContain(`Tier de interesse: ${id}`);

      // (4) PNG proof: capture a full-page screenshot of /parceiros in this selected
      // state, then verify the file on disk is a real, non-trivial PNG.
      const shot = path.join(SHOT_DIR, `parceiros-${String(i + 1).padStart(2, '0')}-${id}.png`);
      // Bring the selected card into view first so the full-page capture is not a
      // scroll-position surprise (fullPage stitches the whole document regardless,
      // but scrolling to the card keeps the artifact's above-the-fold sensible).
      await card.scrollIntoViewIfNeeded().catch(() => {});
      await page.screenshot({ path: shot, fullPage: true });
      const bytes = verifyPng(shot);
      console.log(`[parceiros] tier ${id}: selected + mailto verified, PNG ${bytes} bytes -> ${shot}`);
    });
  }

  // Guard: with the required fields EMPTY, the CTA is disabled (aria-disabled) and
  // exposes no mailto href — so no tier can leak out through a submittable form.
  test('CTA is disabled until the required fields are filled', async ({ page }) => {
    await gotoParceiros(page);
    const cta = page.locator(CTA);
    await expect(cta, 'CTA not marked disabled on an empty form').toHaveAttribute('aria-disabled', 'true');
    // href is undefined (React drops the attr) when the form is not submittable.
    expect(await cta.getAttribute('href'), 'CTA exposed a mailto href on an empty form').toBeNull();
  });
});
