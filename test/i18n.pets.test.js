// i18n.pets.test.js — PET-M23 verification: every user-visible /pets string is
// routed through strings.js t() and pt-BR <-> es reach FULL key-parity.
//
// The /pets surfaces hardcoded their copy. This suite is the machine-checkable
// proof (the forcing-function PET-M23 asks for) that:
//   • every `pets.*` key in pt-BR exists in es and vice-versa (1:1 parity);
//   • no `pets.*` value is an empty string in either locale;
//   • t() resolves the active locale for a representative sample (incl. the
//     dignity-sensitive lines, which must read with care in BOTH languages);
//   • the petDomain SOT labels/hints resolve via t() (ids stay the SOT) and the
//     pt-BR value is byte-identical to the dictionary (so the SOT-importing
//     render tests stay green);
//   • the failure/throttle copy constants now resolve via t() (not inline);
//   • placeholders ({coords}/{mb}/{count}/{total}/{area}/{desc}) survive in both.
//
// Mirrors the parity discipline of i18n.assinar.test.js, scoped to the pets.*
// prefix. pt-BR is DEFAULT_LOCALE so the visible behavior is unchanged for users.

import { describe, it, expect, afterEach, beforeEach } from 'vitest';

import { t, setLocale, localeKeys, SUPPORTED_LOCALES } from
  '../src/app/components/compatibility/components/ux/strings.js';
import {
  PET_STATUSES,
  PET_SPECIES,
  PET_SIZES,
  PET_PUBLISH_FAILURE,
  PET_PUBLISH_FAILURE_COPY,
  PET_PUBLISH_THROTTLE,
  PET_PUBLISH_THROTTLE_COPY,
} from '../src/app/pets/petDomain.js';
import { buildPetShareMessage } from '../src/app/pets/petShare.js';

const PREFIX = 'pets.';
const petsKeys = (locale) => localeKeys(locale).filter((k) => k.startsWith(PREFIX));

// pt-BR is the default; reset after each test so order is irrelevant and no test
// leaks a locale into the next (module-level currentLocale is shared).
beforeEach(() => { setLocale('pt-BR'); });
afterEach(() => { setLocale('pt-BR'); });

describe('pets.* dictionary — parity across all locales', () => {
  // INTL M6.4: data-driven over SUPPORTED_LOCALES (was a hard-coded pt-BR/es
  // deep-equal). en-US is covered automatically; pt-BR is the reference set.
  it('exposes the exact same pets.* key set in every locale (no orphans)', () => {
    const reference = petsKeys('pt-BR');
    expect(reference.length).toBeGreaterThan(0);
    for (const locale of SUPPORTED_LOCALES) {
      expect(petsKeys(locale), `${locale} pets.* key set must equal pt-BR 1:1`).toEqual(reference);
    }
  });

  it('actually has a substantial pets.* key set (guards an empty filter passing)', () => {
    // The /pets surface is large; assert a real namespace, not a stray key or two.
    expect(petsKeys('pt-BR').length).toBeGreaterThan(80);
  });

  it('has no empty-string value for any pets.* key in any locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      setLocale(locale);
      for (const key of petsKeys(locale)) {
        const value = t(key);
        expect(value, `${locale} / ${key} is empty`).toBeTypeOf('string');
        expect(value.trim().length, `${locale} / ${key} is blank`).toBeGreaterThan(0);
        // A missing key falls back to the key itself; that would mean a hole.
        expect(value, `${locale} / ${key} resolved to the key (missing)`).not.toBe(key);
      }
    }
  });

  it('pt-BR and es differ for the human-authored body copy (not a copy-paste)', () => {
    // A handful of dignity-sensitive lines must be genuinely translated, not left
    // identical in both locales (which would betray a missed translation).
    const mustDiffer = [
      'pets.detail.privacy.note',
      'pets.detail.lifecycle.confirmReunido.note',
      'pets.detail.lifecycle.confirmEncerrado.note',
      'pets.detail.lifecycle.done.encerrado',
      'pets.report.freetext.warning',
      'pets.closure.lead',
      'pets.detail.match.lead.lost',
    ];
    for (const key of mustDiffer) {
      setLocale('pt-BR');
      const pt = t(key);
      setLocale('es');
      const es = t(key);
      expect(es, `${key} must be translated, not identical`).not.toBe(pt);
    }
  });

  // INTL M6.3 — the en-US drafting gate (honors D7: never machine-translate
  // dignity-sensitive copy; ship it only after human review).
  it('en-US dignity-sensitive pets copy is DRAFTED, marked [REVISAR-HUMANO]', () => {
    setLocale('en-US');
    // The M6.3 sensitive set: status hints, consent/privacy, reunite/close
    // confirms + done, the safe-contact note, the match "could be" lines, the
    // publish-failure/throttle copy, the closure reassurance, and the flag copy.
    const mustReview = [
      'pets.status.perdido.hint',
      'pets.report.freetext.warning',
      'pets.report.consent.post',
      'pets.report.photo.privacy',
      'pets.detail.privacy.note',
      'pets.detail.match.lead.lost',
      'pets.detail.lifecycle.confirmReunido.note',
      'pets.detail.lifecycle.confirmEncerrado.note',
      'pets.detail.lifecycle.done.reunido',
      'pets.detail.lifecycle.done.encerrado',
      'pets.publish.failed.out_of_bounds',
      'pets.publish.throttle.identical',
      'pets.closure.lead',
      'pets.detail.flag.note',
    ];
    for (const key of mustReview) {
      expect(t(key), `${key} must stay [REVISAR-HUMANO] until human-approved`)
        .toMatch(/^\[REVISAR-HUMANO\] /);
    }
  });

  it('en-US mechanical pets labels are FINAL (no [REVISAR-HUMANO] marker)', () => {
    setLocale('en-US');
    // Mechanical labels (petDomain LABELS, view toggles, button labels) ship as
    // direct translations.
    const mustBeFinal = [
      'pets.status.perdido.label',
      'pets.species.cao.label',
      'pets.size.medio.label',
      'pets.view.list',
      'pets.report.btn.publish',
      'pets.detail.close',
      'pets.filter.clear',
    ];
    for (const key of mustBeFinal) {
      expect(t(key), `${key} is mechanical and should be final`)
        .not.toMatch(/\[REVISAR-HUMANO\]/);
    }
    expect(t('pets.status.perdido.label')).toBe('Lost');
    expect(t('pets.species.cao.label')).toBe('Dog');
  });
});

describe('pets.* — locale resolution sample', () => {
  it('pt-BR resolves the original copy', () => {
    expect(t('pets.header.lead.cta')).toBe('Relatar um pet');
    expect(t('pets.report.title')).toBe('Reportar um pet');
    expect(t('pets.detail.reveal')).toBe('Mostrar contato de quem reportou');
    expect(t('pets.closure.title')).toBe('Seu pet está no mapa');
  });

  it('es resolves the careful Spanish copy', () => {
    setLocale('es');
    expect(t('pets.header.lead.cta')).toBe('Reportar una mascota');
    expect(t('pets.report.title')).toBe('Reportar una mascota');
    expect(t('pets.detail.reveal')).toBe('Mostrar el contacto de quien reportó');
    expect(t('pets.closure.title')).toBe('Tu mascota está en el mapa');
  });

  it('dignity-sensitive status hints read with care in BOTH languages', () => {
    setLocale('pt-BR');
    expect(t('pets.status.perdido.hint')).toBe('Meu pet sumiu');
    setLocale('es');
    expect(t('pets.status.perdido.hint')).toBe('Mi mascota se perdió');
  });

  it('the interpolation placeholders survive in both locales', () => {
    for (const locale of ['pt-BR', 'es']) {
      setLocale(locale);
      expect(t('pets.report.location.set')).toContain('{coords}');
      expect(t('pets.report.photo.privacy')).toContain('{mb}');
      expect(t('pets.filter.count.all')).toContain('{count}');
      expect(t('pets.filter.count.some')).toContain('{count}');
      expect(t('pets.filter.count.some')).toContain('{total}');
      expect(t('pets.share.area')).toContain('{area}');
      expect(t('pets.detail.photo.alt')).toContain('{desc}');
    }
  });
});

describe('petDomain SOT — labels/hints resolve via t() (ids stay the SOT)', () => {
  it('every status/species/size label matches its pets.* key in pt-BR', () => {
    setLocale('pt-BR');
    for (const s of PET_STATUSES) {
      expect(s.label).toBe(t(`pets.status.${s.id}.label`));
      expect(s.hint).toBe(t(`pets.status.${s.id}.hint`));
    }
    for (const s of PET_SPECIES) expect(s.label).toBe(t(`pets.species.${s.id}.label`));
    for (const s of PET_SIZES) expect(s.label).toBe(t(`pets.size.${s.id}.label`));
  });

  it('the SOT labels FOLLOW the active locale (proves they are not inline)', () => {
    setLocale('es');
    expect(PET_STATUSES.find((s) => s.id === 'perdido').label).toBe('Perdida');
    expect(PET_SPECIES.find((s) => s.id === 'cao').label).toBe('Perro');
    expect(PET_SIZES.find((s) => s.id === 'medio').label).toBe('Mediano');
  });
});

describe('publish failure/throttle copy — resolved via t(), not inline', () => {
  it('failure copy follows the active locale by code', () => {
    setLocale('pt-BR');
    expect(PET_PUBLISH_FAILURE_COPY[PET_PUBLISH_FAILURE.OFFLINE])
      .toBe(t('pets.publish.failed.offline'));
    setLocale('es');
    expect(PET_PUBLISH_FAILURE_COPY[PET_PUBLISH_FAILURE.OFFLINE])
      .toBe(t('pets.publish.failed.offline'));
    // es reassures it was saved (dignity-sensitive: never "try again later").
    expect(PET_PUBLISH_FAILURE_COPY[PET_PUBLISH_FAILURE.OFFLINE]).toMatch(/guard/i);
  });

  it('throttle copy follows the active locale by code', () => {
    setLocale('es');
    expect(PET_PUBLISH_THROTTLE_COPY[PET_PUBLISH_THROTTLE.IDENTICAL])
      .toBe(t('pets.publish.throttle.identical'));
    expect(PET_PUBLISH_THROTTLE_COPY[PET_PUBLISH_THROTTLE.IDENTICAL]).toMatch(/ya está en el mapa/i);
  });
});

describe('petShare message — i18n in the ACTIVE locale (read at call time)', () => {
  const LOST_PET = {
    coords: [-8.0671132, -34.8766719],
    status: 'perdido',
    species: 'cao',
    dateIso: '2026-06-11T12:00:00.000Z',
  };

  it('pt-BR share message uses the pt-BR lead + species + invite', () => {
    setLocale('pt-BR');
    const { text, title } = buildPetShareMessage(LOST_PET);
    expect(text.toLowerCase()).toContain('perdido');
    expect(text.toLowerCase()).toContain('cão');
    expect(text).toContain(t('pets.share.invite'));
    expect(title).toBe('Pet no MAPA FOME');
  });

  it('es share message uses the careful Spanish lead + species + invite', () => {
    setLocale('es');
    const { text, title } = buildPetShareMessage(LOST_PET);
    expect(text.toLowerCase()).toContain('perdida');
    expect(text.toLowerCase()).toContain('perro');
    expect(text).toContain(t('pets.share.invite'));
    expect(title).toBe('Mascota en MAPA FOME');
  });
});
