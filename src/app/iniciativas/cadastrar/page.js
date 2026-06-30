'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import './register.css';
import { t, useLocale } from '../../components/compatibility/components/ux/strings';

// M6 — initiatives registration. Ongoing groups (soup kitchens, neighborhood
// collectives) announce fixed locations so donors and people in need can
// find them. Never in the primary header (Hick's Law).

// Category ids are the source of truth; the visible chip label is resolved via
// t() at render so it follows the active locale.
const CATEGORY_IDS = ['comida', 'agua', 'roupa', 'higiene', 'abrigo'];

// Weekday ids (Sun..Sat, index 0..6) are the source of truth persisted in the
// payload; the visible chip label is resolved via t(`page.initiative.day_${i}`)
// at render so it follows the active locale (mirrors the cat_ chips above).
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export default function InitiativeRegisterPage() {
  useLocale(); // re-render on locale change so t() re-reads
  const [nome, setNome] = useState('');
  const [cats, setCats] = useState(new Set());
  const [endereco, setEndereco] = useState('');
  const [dias, setDias] = useState(new Set());
  const [horario, setHorario] = useState('');
  const [contato, setContato] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error

  function toggleCat(id) {
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleDay(id) {
    setDias((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim() || cats.size === 0 || !endereco.trim() || !contato.trim()) return;

    setStatus('submitting');
    const payload = {
      nome: nome.trim(),
      categorias: Array.from(cats),
      endereco: endereco.trim(),
      dias: Array.from(dias),
      horario: horario.trim(),
      contato: contato.trim(),
      createdAt: new Date().toISOString(),
      kind: 'initiative',
    };
    try {
      // Minimal persistence: localStorage draft. Wiring into Google Sheets
      // can happen in a follow-up once a sheet/tab convention is chosen.
      try {
        const key = 'mdf_initiatives';
        const existing = JSON.parse(window.localStorage.getItem(key) || '[]');
        existing.push(payload);
        window.localStorage.setItem(key, JSON.stringify(existing));
      } catch (_e) { /* storage quota / private mode */ }
      setStatus('success');
    } catch (_err) {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <main className="mdf-initiative-ok">
        <h1>{t('page.initiative.ok_title')}</h1>
        <p>{t('page.initiative.ok_body')}</p>
        <Link href="/">{t('page.initiative.ok_back')}</Link>
      </main>
    );
  }

  return (
    <main className="mdf-initiative">
      <Link href="/" className="mdf-initiative__back">{t('page.initiative.back')}</Link>
      <h1>{t('page.initiative.title')}</h1>
      <p className="mdf-initiative__sub">
        {t('page.initiative.sub')}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <label className="mdf-field">
          <span>{t('page.initiative.name_label')}</span>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={80}
            required
          />
        </label>

        <fieldset className="mdf-field">
          <legend>{t('page.initiative.what_legend')}</legend>
          <div className="mdf-chips">
            {CATEGORY_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="checkbox"
                aria-checked={cats.has(id)}
                className={`mdf-chip${cats.has(id) ? ' mdf-chip--on' : ''}`}
                onClick={() => toggleCat(id)}
              >
                {t(`page.initiative.cat_${id}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mdf-field">
          <span>{t('page.initiative.addr_label')}</span>
          <input
            type="text"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder={t('page.initiative.addr_ph')}
            maxLength={140}
            required
          />
        </label>

        <fieldset className="mdf-field">
          <legend>{t('page.initiative.days_legend')}</legend>
          <div className="mdf-chips">
            {WEEKDAYS.map((d, i) => (
              <button
                key={d}
                type="button"
                role="checkbox"
                aria-checked={dias.has(d)}
                className={`mdf-chip${dias.has(d) ? ' mdf-chip--on' : ''}`}
                onClick={() => toggleDay(d)}
              >
                {t(`page.initiative.day_${i}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mdf-field">
          <span>{t('page.initiative.time_label')}</span>
          <input
            type="text"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            placeholder={t('page.initiative.time_ph')}
            maxLength={40}
          />
        </label>

        <label className="mdf-field">
          <span>{t('page.initiative.contact_label')}</span>
          <input
            type="text"
            value={contato}
            onChange={(e) => setContato(e.target.value)}
            placeholder={t('page.initiative.contact_ph')}
            maxLength={80}
            required
          />
        </label>

        {status === 'error' && (
          <p className="mdf-initiative__error" role="alert">
            {t('page.initiative.error')}
          </p>
        )}

        <button
          type="submit"
          className="mdf-initiative__submit"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? t('page.initiative.submitting') : t('page.initiative.submit')}
        </button>
      </form>
    </main>
  );
}
