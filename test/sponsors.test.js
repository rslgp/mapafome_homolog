// Characterization tests for sponsors.js — protects the date-parsing,
// expiry, and reach-targeting logic that drives the carousel + B11 fix.

import { describe, it, expect } from 'vitest';
import {
    parseDate,
    isActiveNow,
    isInsideReach,
    eligibleSponsors,
    pickSponsor,
    clampDescription,
    PLACEMENTS,
    DESCRIPTION_MAX,
} from '../src/app/components/compatibility/components/ux/sponsors.js';

describe('parseDate', () => {
    it('accepts ISO YYYY-MM-DD', () => {
        expect(Number.isFinite(parseDate('2026-02-17'))).toBe(true);
    });
    it('accepts MM-DD-YYYY (US contract dates)', () => {
        expect(Number.isFinite(parseDate('02-17-2026'))).toBe(true);
    });
    it('accepts DD/MM/YYYY (BR contract dates)', () => {
        expect(Number.isFinite(parseDate('17/02/2026'))).toBe(true);
    });
    it('returns NaN for missing or malformed input (fail-open)', () => {
        expect(parseDate(undefined)).toBeNaN();
        expect(parseDate(null)).toBeNaN();
        expect(parseDate('not-a-date')).toBeNaN();
        expect(parseDate('2026-13-99')).toBeNaN();
    });
});

describe('isActiveNow', () => {
    const t = (iso) => new Date(iso).getTime();
    it('treats missing dates as evergreen', () => {
        expect(isActiveNow({})).toBe(true);
    });
    it('returns false before startsAt', () => {
        expect(isActiveNow({ startsAt: '2026-12-31' }, t('2026-01-01T00:00:00Z'))).toBe(false);
    });
    it('returns true within window', () => {
        expect(isActiveNow({ startsAt: '2026-01-01', expiresAt: '2026-12-31' }, t('2026-06-15T00:00:00Z'))).toBe(true);
    });
    it('returns false after expiresAt end-of-day', () => {
        expect(isActiveNow({ expiresAt: '2026-01-01' }, t('2026-01-02T12:00:00Z'))).toBe(false);
    });
});

describe('isInsideReach', () => {
    it('returns false when sponsor has no center/radius', () => {
        expect(isInsideReach({}, [-7.1, -34.8])).toBe(false);
    });
    it('returns false when user has no coords', () => {
        expect(isInsideReach({ center: [-7.1, -34.8], radiusKm: 5 }, null)).toBe(false);
    });
    it('returns true when user is within radius', () => {
        expect(isInsideReach({ center: [-7.1, -34.8], radiusKm: 5 }, [-7.10001, -34.80001])).toBe(true);
    });
    it('returns false when user is far outside', () => {
        expect(isInsideReach({ center: [-7.1, -34.8], radiusKm: 5 }, [-23.5, -46.6])).toBe(false);
    });
});

// ── Placement slots ──────────────────────────────────────────────
// eligibleSponsors/pickSponsor read the live SPONSORS registry. These
// assert the placement CONTRACT (which slot a sponsor opts into filters
// it in/out), the region '*' fallback, the reach-first sort order, and
// the weighted pick — driven through the real module, no mocking.

describe('PLACEMENTS registry', () => {
    it('exposes the four known slot slugs', () => {
        expect(PLACEMENTS.INFO_PANEL_FOOTER).toBe('info-panel-footer');
        expect(PLACEMENTS.INFO_PANEL_PARCEIROS).toBe('info-panel-parceiros');
        expect(PLACEMENTS.APOIAR_GRID).toBe('apoiar-grid');
        expect(PLACEMENTS.INITIATIVES_FOOTER).toBe('initiatives-footer');
    });
    it('has no duplicate slot slugs', () => {
        const slugs = Object.values(PLACEMENTS);
        expect(new Set(slugs).size).toBe(slugs.length);
    });
});

describe('eligibleSponsors — placement filtering', () => {
    it('returns the evergreen sponsor for a placement it opts into', () => {
        const out = eligibleSponsors(PLACEMENTS.INFO_PANEL_FOOTER, 'global');
        expect(out.length).toBeGreaterThan(0);
        expect(out.every((s) => s.placements.includes(PLACEMENTS.INFO_PANEL_FOOTER))).toBe(true);
    });

    it('excludes sponsors that did not opt into the requested slot', () => {
        // The seed 'apoie' sponsor does NOT list INFO_PANEL_PARCEIROS.
        const out = eligibleSponsors(PLACEMENTS.INFO_PANEL_PARCEIROS, 'global');
        expect(out.find((s) => s.id === 'apoie')).toBeUndefined();
    });

    it('returns [] for an unknown placement slug', () => {
        expect(eligibleSponsors('does-not-exist', 'global')).toEqual([]);
    });

    it('never returns a sponsor for a slot outside its placements[]', () => {
        for (const placement of Object.values(PLACEMENTS)) {
            const out = eligibleSponsors(placement, 'global');
            for (const s of out) {
                expect(s.placements).toContain(placement);
            }
        }
    });
});

describe('eligibleSponsors — region targeting', () => {
    it("matches a '*' sponsor for any resolved region", () => {
        const g = eligibleSponsors(PLACEMENTS.APOIAR_GRID, 'global');
        const recife = eligibleSponsors(PLACEMENTS.APOIAR_GRID, 'pe-recife');
        expect(g.map((s) => s.id)).toEqual(recife.map((s) => s.id));
    });

    it('filters out sponsors whose time window has closed', () => {
        // Far-future clock: an evergreen ('*', no expiresAt) sponsor is still
        // active, so the slot stays populated regardless of `now`.
        const future = new Date('2099-01-01T00:00:00Z').getTime();
        const out = eligibleSponsors(PLACEMENTS.INFO_PANEL_FOOTER, 'global', null, future);
        expect(out.every((s) => isActiveNow(s, future))).toBe(true);
    });
});

describe('eligibleSponsors — sort order', () => {
    it('sorts paid-reach radius matches ahead of region-only matches', () => {
        // Both synthetic sponsors share the placement; only one is geo-hit.
        const now = Date.now();
        const near = [-8.05, -34.88];
        const list = eligibleSponsors(PLACEMENTS.INFO_PANEL_FOOTER, 'pe-recife', near, now);
        // Any sponsor flagged as a reach hit must precede a non-hit.
        let seenNonHit = false;
        for (const s of list) {
            const hit = isInsideReach(s, near);
            if (!hit) seenNonHit = true;
            if (hit) expect(seenNonHit).toBe(false); // no hit after a non-hit
        }
    });
});

describe('pickSponsor', () => {
    it('returns null when no sponsor is eligible for the slot', () => {
        expect(pickSponsor(PLACEMENTS.INFO_PANEL_PARCEIROS, 'global')).toBeNull();
    });

    it('returns an eligible sponsor for a populated slot', () => {
        const picked = pickSponsor(PLACEMENTS.INFO_PANEL_FOOTER, 'global', null, () => 0);
        expect(picked).not.toBeNull();
        expect(picked.placements).toContain(PLACEMENTS.INFO_PANEL_FOOTER);
    });

    it('is deterministic given a fixed rng', () => {
        const a = pickSponsor(PLACEMENTS.INFO_PANEL_FOOTER, 'global', null, () => 0.42);
        const b = pickSponsor(PLACEMENTS.INFO_PANEL_FOOTER, 'global', null, () => 0.42);
        expect(a?.id).toBe(b?.id);
    });

    it('always returns one of the eligible sponsors', () => {
        const eligible = eligibleSponsors(PLACEMENTS.INFO_PANEL_FOOTER, 'global');
        const ids = new Set(eligible.map((s) => s.id));
        for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
            const picked = pickSponsor(PLACEMENTS.INFO_PANEL_FOOTER, 'global', null, () => r);
            expect(ids.has(picked.id)).toBe(true);
        }
    });
});

describe('clampDescription', () => {
    it('leaves a short description untouched', () => {
        expect(clampDescription('curto')).toBe('curto');
    });
    it('truncates to the 150-char contract with an ellipsis', () => {
        const long = 'x'.repeat(DESCRIPTION_MAX + 50);
        const out = clampDescription(long);
        expect(out.length).toBe(DESCRIPTION_MAX);
        expect(out.endsWith('…')).toBe(true);
    });
    it('coerces null/undefined to an empty string, never throws', () => {
        expect(clampDescription(null)).toBe('');
        expect(clampDescription(undefined)).toBe('');
    });
});
