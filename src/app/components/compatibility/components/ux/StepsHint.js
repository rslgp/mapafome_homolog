'use client';

import React from 'react';
import Link from 'next/link';
import './StepsHint.css';
import { t, useLocale } from './strings';

// Cada passo aponta para a área que deve ganhar foco ao ser tocado. Os
// seletores espelham os do tour guiado (GuidedTutorial) para manter a
// referência única de "onde fica cada passo".
// labelKey is resolved via t() at render (not module load) so it follows a
// language switch. Steps are currently disabled in the render but kept here.
const STEPS = [
  { n: 1, labelKey: 'page.steps.step1', selectors: ['.leaflet-container', '#mdf-target-map'] },
  { n: 2, labelKey: 'page.steps.step2', selectors: ['#CoffeeTable', '#mdf-target-controls'] },
  { n: 3, labelKey: 'page.steps.step3', selectors: ['#mdf-target-confirm', '.marcar-local'] },
];

// Rola a tela até o primeiro seletor encontrado, posicionando a área logo
// abaixo do header fixo (sticky) para que o passo escolhido fique visível —
// movimento nítido e distinto para cada passo, como o botão "Ver mais".
function scrollToSelectors(selectors) {
  if (typeof document === 'undefined') return;
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const header = document.querySelector('.mdf-header');
      const headerH = header ? header.getBoundingClientRect().height : 0;
      const top =
        el.getBoundingClientRect().top + window.scrollY - headerH - 12;
      window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
      return;
    }
  }
}

export default function StepsHint({ activeStep = 0 }) {
  useLocale(); // re-render on locale change so t() re-reads
  const scrollToInstall = () => {
    // Leva a pessoa até os botões de instalar (badges no InfoPanel). Quando o
    // app já está instalado as badges não renderizam, então caímos no painel.
    const target =
      document.querySelector('.ip-apps__install-badges') ||
      document.getElementById('MoreInfo');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <aside
      className="mdf-steps"
      role="region"
      aria-label={t('page.steps.region_aria')}
    >
      {/* Trilho de rolagem HORIZONTAL: todos os atalhos vivem num único div que
          é o container de scroll (overflow-x). Mantê-los aqui (e não soltos no
          <aside>) garante o scroll lateral em telas estreitas independente do
          padding/flex do aside — os filhos não encolhem (flex:0 0 auto no CSS),
          então o trilho rola em vez de espremer/cortar os botões. */}
      <div className="mdf-steps__scroll">
        {/* Os três passos numerados ficam desativados por ora (fluxo guiado em
            revisão); os atalhos abaixo continuam ativos. */}
        <button
          type="button"
          className="mdf-steps__tour"
          onClick={scrollToInstall}
          aria-label={t('page.steps.more_aria')}
        >
          {t('page.steps.more')}
        </button>
        {/* Atalho para o MapaPet (achados e perdidos) — link de navegação real
            (Next Link/<a href>), operável por teclado e antes da hidratação. */}
        <Link
          href="/pets"
          className="mdf-steps__pets"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('page.steps.pets_aria')}
        >
          <span aria-hidden="true">🐾</span>
          <span className="mdf-steps__pets-label">{t('page.steps.pets_label')}</span>
        </Link>

        <Link
          href="/solone"
          className="mdf-steps__pets"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('page.steps.solone_aria')}
        >
          <span aria-hidden="true">🎮</span>
        </Link>

        <Link
          href="/bluey"
          className="mdf-steps__pets"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('page.steps.bluey_aria')}
        >
          <span aria-hidden="true">👦👧 2a9 anos</span>
        </Link>
      </div>
    </aside>
  );
}
