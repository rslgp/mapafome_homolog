// intlAnalytics.test.js — INTL M5 (MISS-2). The intl funnel helpers over the
// EXISTING analytics.track seam (MOCKED): publish_intl / moderation_intl fire
// with the right NAME + shape, capture the COUNTRY, attach the build id from the
// fail-soft cache, drop undefined keys, and stay no-op-SAFE when track throws.
//
// We do NOT test gtag/dataLayer/sessionStorage transport here (that is
// analytics.js' own surface, and the deployed sink is inert anyway — see the
// intlAnalytics.js header). We test that the FUNNEL calls the seam correctly.
//
// The WIRING (publishPinFromMap really calls trackPublishIntl) is a separate file
// (publishPinFromMap.intl.test.js) because that one MOCKS intlAnalytics, which is
// incompatible with importing the real module here in the same file.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockTrack } = vi.hoisted(() => ({ mockTrack: vi.fn() }));
vi.mock('../src/app/components/compatibility/components/ux/analytics.js', () => ({
  track: mockTrack,
}));

import {
  INTL_EVENT,
  trackPublishIntl,
  trackModerationIntl,
  rememberBuildVersion,
  readBuildVersion,
  __resetIntlAnalyticsForTests,
} from '../src/app/components/compatibility/components/ux/intlAnalytics.js';

function lastCall() {
  expect(mockTrack).toHaveBeenCalled();
  const calls = mockTrack.mock.calls;
  return calls[calls.length - 1];
}
const lastName = () => lastCall()[0];
const lastProps = () => lastCall()[1] || {};

beforeEach(() => {
  mockTrack.mockClear();
  __resetIntlAnalyticsForTests();
});

describe('intlAnalytics — event names (SOT)', () => {
  it('publish fires the stable publish_intl name', () => {
    trackPublishIntl({ country: 'es' });
    expect(lastName()).toBe(INTL_EVENT.PUBLISH);
    expect(INTL_EVENT.PUBLISH).toBe('publish_intl');
  });

  it('moderation fires the stable moderation_intl name', () => {
    trackModerationIntl({ country: 'pt', kind: 'delete' });
    expect(lastName()).toBe(INTL_EVENT.MODERATION);
    expect(INTL_EVENT.MODERATION).toBe('moderation_intl');
  });
});

describe('intlAnalytics — publish_intl captures the COUNTRY + shape', () => {
  it('passes the marked-in country through verbatim (normalized lowercase)', () => {
    trackPublishIntl({ country: 'ES', inSelectedBbox: true, offshoreHeuristic: 'passed' });
    const p = lastProps();
    expect(p.country).toBe('es');
    expect(p.in_selected_bbox).toBe(true);
    expect(p.offshore_heuristic).toBe('passed');
  });

  it("a missing/blank country defaults to 'br' (the §4.4/§4.6.1 legacy default)", () => {
    trackPublishIntl({});
    expect(lastProps().country).toBe('br');
    trackPublishIntl({ country: '   ' });
    expect(lastProps().country).toBe('br');
  });

  it('omits undefined optional fields (lean payload — no null props)', () => {
    trackPublishIntl({ country: 'fr' });
    const p = lastProps();
    expect(p.country).toBe('fr');
    expect(Object.prototype.hasOwnProperty.call(p, 'in_selected_bbox')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(p, 'offshore_heuristic')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(p, 'build')).toBe(false);
  });

  it('coerces a non-boolean inSelectedBbox / non-string offshoreHeuristic away (no garbage)', () => {
    trackPublishIntl({ country: 'it', inSelectedBbox: 'yes', offshoreHeuristic: 42 });
    const p = lastProps();
    expect(Object.prototype.hasOwnProperty.call(p, 'in_selected_bbox')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(p, 'offshore_heuristic')).toBe(false);
  });

  it('OFF-path shape: country br + offshore not_run still fires (OFF behavior unchanged)', () => {
    trackPublishIntl({ country: 'br', inSelectedBbox: true, offshoreHeuristic: 'not_run' });
    const p = lastProps();
    expect(p.country).toBe('br');
    expect(p.offshore_heuristic).toBe('not_run');
  });
});

describe('intlAnalytics — build id from the fail-soft cache (M5 (c))', () => {
  it('attaches the remembered build version to the event', () => {
    rememberBuildVersion('1.0.0-123-abc');
    expect(readBuildVersion()).toBe('1.0.0-123-abc');
    trackPublishIntl({ country: 'es' });
    expect(lastProps().build).toBe('1.0.0-123-abc');
  });

  it('ignores a non-string / empty build version (cache stays cold → field omitted)', () => {
    rememberBuildVersion(undefined);
    rememberBuildVersion('');
    rememberBuildVersion(42);
    expect(readBuildVersion()).toBe(undefined);
    trackPublishIntl({ country: 'es' });
    expect(Object.prototype.hasOwnProperty.call(lastProps(), 'build')).toBe(false);
  });
});

describe('intlAnalytics — moderation_intl enum guard', () => {
  it("keeps only kind in {'delete','verify'}; anything else is omitted", () => {
    trackModerationIntl({ country: 'pt', kind: 'verify' });
    expect(lastProps().kind).toBe('verify');
    trackModerationIntl({ country: 'pt', kind: 'nuke' });
    expect(Object.prototype.hasOwnProperty.call(lastProps(), 'kind')).toBe(false);
  });
});

describe('intlAnalytics — NO-OP SAFE when the transport throws', () => {
  it('SWALLOWS a throwing sink — a broken track() never crashes the publish', () => {
    mockTrack.mockImplementationOnce(() => { throw new Error('sink exploded'); });
    // HARD constraint (M5): a broken/inert analytics sink must NEVER cost a user
    // their publish. The helper belt-and-suspenders the whole emission, so even an
    // unexpected throw from track() does not escape into the publish path.
    expect(() => trackPublishIntl({ country: 'es' })).not.toThrow();
    mockTrack.mockImplementationOnce(() => { throw new Error('sink exploded'); });
    expect(() => trackModerationIntl({ country: 'es', kind: 'delete' })).not.toThrow();
  });

  it('the REAL analytics.track is itself no-op-safe (SSR / empty name)', async () => {
    // Verify the production seam (not the mock) is guarded: with an empty name and
    // a plain props object it returns silently. This is part of why the publish
    // path is safe — the seam, not just the helper, owns a guard.
    const real = await vi.importActual(
      '../src/app/components/compatibility/components/ux/analytics.js'
    );
    expect(() => real.track('', {})).not.toThrow();
    expect(() => real.track('publish_intl', { country: 'es' })).not.toThrow();
  });
});
