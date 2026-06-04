'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getCookie, setCookie, removeCookie } from '../cookies';
import './GuidedTutorial.css';
import { trackReportStarted } from './analytics';

const COOKIE_NAME = 'mdf_tour_done';
const COOKIE_TTL_DAYS = 365;

/* Two parallel flows. The user picks one on the chooser stop;
 * the chosen flow then runs as 3 contextual steps spotlighting real DOM. */

const CHOOSER = {
  kind: 'chooser',
  title: 'Bem-vindo ao MAPA FOME',
  body: 'Em 3 passos você ajuda a combater a fome. O que descreve melhor você agora?',
  options: [
    {
      key: 'reporter',
      label: 'Vi alguém precisando de comida',
      hint: 'Vou marcar um ponto amarelo no mapa',
      swatchClass: 'mdf-tour__swatch--yellow',
    },
    {
      key: 'helper',
      label: 'Represento uma iniciativa que ajuda',
      hint: 'Igreja, ONG ou grupo — ponto azul ou vermelho',
      swatchClass: 'mdf-tour__swatch--bluered',
    },
  ],
};

const REPORTER_STOPS = [
  {
    selectors: ['.leaflet-container', '#mdf-target-map'],
    title: 'Passo 1 — Toque no mapa',
    body: 'Encontre no mapa o local onde você viu a pessoa e toque para marcar o ponto.',
  },
  {
    selectors: ['#CoffeeTable', '#mdf-target-controls'],
    title: 'Passo 2 — Escolha a categoria amarela',
    body: 'Marque "Pessoa precisando de Alimento pronto" ou "Cesta básica". As duas aparecem como pontos amarelos no mapa.',
  },
  {
    selectors: ['#mdf-target-confirm', '.marcar-local'],
    title: 'Passo 3 — Confirme o ponto',
    body: 'Revise e confirme. O ponto fica visível para que um voluntário próximo possa levar ajuda.',
  },
];

const HELPER_STOPS = [
  {
    selectors: ['.leaflet-container', '#mdf-target-map'],
    title: 'Passo 1 — Toque onde sua iniciativa atua',
    body: 'Marque no mapa o ponto fixo onde sua igreja, ONG ou grupo recebe doações ou entrega refeições.',
  },
  {
    selectors: ['#CoffeeTable', '#mdf-target-controls'],
    title: 'Passo 2 — Azul ou vermelho?',
    body: 'Azul: você recebe alimentos ou recursos para distribuir (ONGs, sopão, voluntários). Vermelho: você entrega refeição em ponto fixo da rua em certo dia da semana.',
  },
  {
    selectors: ['.tfMarginUp', '#mdf-target-confirm'],
    title: 'Passo 3 — Contato, Instagram e confirmação',
    body: 'Adicione um telefone com DDD e o Instagram (ou Facebook) da sua iniciativa para que doadores cheguem até você. Depois confirme o ponto.',
  },
];

function findEl(selectors) {
  if (typeof document === 'undefined' || !selectors) return null;
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function getRect(selectors) {
  const el = findEl(selectors);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    bottom: r.bottom,
    right: r.right,
  };
}

export default function GuidedTutorial({ open, onClose }) {
  const [flow, setFlow] = useState(null); // null = chooser, 'reporter' | 'helper'
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const dialogRef = useRef(null);

  const stops = flow === 'reporter' ? REPORTER_STOPS : flow === 'helper' ? HELPER_STOPS : null;
  const stop = flow === null ? CHOOSER : stops[index];
  const isChooser = stop.kind === 'chooser';

  useEffect(() => {
    if (!open) return;
    if (isChooser) {
      setRect(null);
      return;
    }
    const update = () => setRect(getRect(stop.selectors));
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('scroll', update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, isChooser, stop, index]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    dialogRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') handleSkip();
      if (!isChooser) {
        if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
        if (e.key === 'ArrowLeft') handlePrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, flow, index]);

  // Reset to chooser whenever the tutorial is reopened.
  useEffect(() => {
    if (open) {
      setFlow(null);
      setIndex(0);
    }
  }, [open]);

  // Scroll-affordance hint: when the card has overflow, briefly scroll it
  // down and back up so the user discovers it's scrollable. Uses a manual
  // requestAnimationFrame tween on scrollTop — scrollTo({behavior:'smooth'})
  // is flaky on iOS Safari for nested overflow containers and can silently
  // no-op. Fires once per step (dep on flow+index). Honors reduced-motion.
  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    const reduceMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let cancelled = false;
    let rafId = null;
    let dwellId = null;

    const tween = (el, from, to, duration) => new Promise((resolve) => {
      if (!el) { resolve(); return; }
      const start = performance.now();
      const tick = (now) => {
        if (cancelled || !dialogRef.current) { resolve(); return; }
        const t = Math.min(1, (now - start) / duration);
        // easeInOutSine — feels intentional, not spring-y
        const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
        el.scrollTop = from + (to - from) * eased;
        if (t < 1) rafId = requestAnimationFrame(tick);
        else resolve();
      };
      rafId = requestAnimationFrame(tick);
    });

    const settleMs = 500; // let the pop-in animation + iOS layout settle
    const peekMs = 700;

    const startTimer = setTimeout(async () => {
      const el = dialogRef.current;
      if (!el || cancelled) return;
      const overflow = el.scrollHeight - el.clientHeight;
      if (overflow < 16) return; // no meaningful overflow — skip

      const nudge = Math.min(56, overflow);
      await tween(el, 0, nudge, 380);
      if (cancelled || !dialogRef.current) return;

      await new Promise((r) => { dwellId = setTimeout(r, peekMs); });
      if (cancelled || !dialogRef.current) return;

      await tween(dialogRef.current, dialogRef.current.scrollTop, 0, 380);
    }, settleMs);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (dwellId) clearTimeout(dwellId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [open, flow, index]);

  function persistDone() {
    const expires = new Date();
    expires.setDate(expires.getDate() + COOKIE_TTL_DAYS);
    setCookie(COOKIE_NAME, '1', { path: '/', expires });
  }

  function handleSkip() {
    persistDone();
    onClose?.('skip');
  }

  function handlePickFlow(key) {
    if (key === 'reporter') {
      trackReportStarted({ entryPoint: 'tour_reporter' });
    }
    setFlow(key);
    setIndex(0);
  }

  function handleNext() {
    if (isChooser) return;
    if (index < stops.length - 1) {
      setIndex(index + 1);
      return;
    }
    persistDone();
    onClose?.('done');
  }

  function handlePrev() {
    if (isChooser) return;
    if (index > 0) {
      setIndex(index - 1);
    } else {
      // First step → return to chooser so user can switch role.
      setFlow(null);
      setIndex(0);
    }
  }

  if (!open) return null;

  const maskStyle = rect
    ? {
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12,
      }
    : null;

  return (
    <div
      className="mdf-tour"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mdf-tour-title"
      aria-describedby="mdf-tour-body"
    >
      <div
        className="mdf-tour__backdrop"
        aria-hidden="true"
        onClick={handleSkip}
      />
      {maskStyle && (
        <div
          className="mdf-tour__spotlight"
          style={maskStyle}
          aria-hidden="true"
        />
      )}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`mdf-tour__card${isChooser ? ' mdf-tour__card--chooser' : ''}`}
      >
        {!isChooser && (
          <div className="mdf-tour__meta">
            {flow === 'reporter' ? 'Pessoa precisando' : 'Iniciativa que ajuda'}
            {' · '}
            Passo {index + 1} de {stops.length}
          </div>
        )}
        <h2 id="mdf-tour-title" className="mdf-tour__title">
          {stop.title}
        </h2>
        <p id="mdf-tour-body" className="mdf-tour__body">
          {stop.body}
        </p>

        {isChooser ? (
          <div className="mdf-tour__choices" role="group" aria-label="Escolha um perfil">
            {CHOOSER.options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className="mdf-tour__choice"
                onClick={() => handlePickFlow(opt.key)}
              >
                <span
                  className={`mdf-tour__swatch ${opt.swatchClass}`}
                  aria-hidden="true"
                />
                <span className="mdf-tour__choice-text">
                  <span className="mdf-tour__choice-label">{opt.label}</span>
                  <span className="mdf-tour__choice-hint">{opt.hint}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              className="mdf-tour__btn mdf-tour__btn--ghost mdf-tour__chooser-skip"
              onClick={handleSkip}
            >
              Pular tutorial
            </button>
          </div>
        ) : (
          <div className="mdf-tour__actions">
            <button
              type="button"
              className="mdf-tour__btn mdf-tour__btn--ghost"
              onClick={handleSkip}
            >
              Pular tutorial
            </button>
            <div className="mdf-tour__nav">
              <button
                type="button"
                className="mdf-tour__btn mdf-tour__btn--ghost"
                onClick={handlePrev}
              >
                {index === 0 ? 'Trocar perfil' : 'Voltar'}
              </button>
              <button
                type="button"
                className="mdf-tour__btn mdf-tour__btn--primary"
                onClick={handleNext}
                autoFocus
              >
                {index < stops.length - 1 ? 'Próximo' : 'Entendi'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function hasSeenTour() {
  if (typeof document === 'undefined') return true;
  return getCookie(COOKIE_NAME) === '1';
}

export function resetTour() {
  removeCookie(COOKIE_NAME, { path: '/' });
}
