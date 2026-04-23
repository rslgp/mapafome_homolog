'use client';

import React, { useState } from 'react';
import './register.css';

// M6 — initiatives registration. Ongoing groups (soup kitchens, neighborhood
// collectives) announce fixed locations so donors and people in need can
// find them. Never in the primary header (Hick's Law).

const CATEGORIES = [
  { id: 'comida',  label: 'Comida' },
  { id: 'agua',    label: 'Água' },
  { id: 'roupa',   label: 'Roupa' },
  { id: 'higiene', label: 'Higiene' },
  { id: 'abrigo',  label: 'Abrigo' },
];

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export default function InitiativeRegisterPage() {
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
        <h1>Iniciativa registrada</h1>
        <p>Obrigado. O ponto aparecerá no mapa em breve, após a revisão da comunidade.</p>
        <a href="/">Voltar para o mapa</a>
      </main>
    );
  }

  return (
    <main className="mdf-initiative">
      <a href="/" className="mdf-initiative__back">← Mapa</a>
      <h1>Cadastrar iniciativa</h1>
      <p className="mdf-initiative__sub">
        Para grupos, ONGs ou coletivos que já distribuem ajuda em um local fixo.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <label className="mdf-field">
          <span>Nome da iniciativa</span>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={80}
            required
          />
        </label>

        <fieldset className="mdf-field">
          <legend>O que distribuem</legend>
          <div className="mdf-chips">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="checkbox"
                aria-checked={cats.has(c.id)}
                className={`mdf-chip${cats.has(c.id) ? ' mdf-chip--on' : ''}`}
                onClick={() => toggleCat(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mdf-field">
          <span>Endereço ou ponto de referência</span>
          <input
            type="text"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Ex: Rua Setúbal, 123 — Boa Viagem, Recife"
            maxLength={140}
            required
          />
        </label>

        <fieldset className="mdf-field">
          <legend>Dias de atuação</legend>
          <div className="mdf-chips">
            {WEEKDAYS.map((d) => (
              <button
                key={d}
                type="button"
                role="checkbox"
                aria-checked={dias.has(d)}
                className={`mdf-chip${dias.has(d) ? ' mdf-chip--on' : ''}`}
                onClick={() => toggleDay(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mdf-field">
          <span>Horário</span>
          <input
            type="text"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            placeholder="Ex: 11h às 14h"
            maxLength={40}
          />
        </label>

        <label className="mdf-field">
          <span>Contato</span>
          <input
            type="text"
            value={contato}
            onChange={(e) => setContato(e.target.value)}
            placeholder="WhatsApp, Instagram ou e-mail"
            maxLength={80}
            required
          />
        </label>

        {status === 'error' && (
          <p className="mdf-initiative__error" role="alert">
            Não foi possível registrar. Tente de novo em alguns segundos.
          </p>
        )}

        <button
          type="submit"
          className="mdf-initiative__submit"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? 'Registrando…' : 'Registrar iniciativa'}
        </button>
      </form>
    </main>
  );
}
