'use client';

import React, { useEffect, useRef, useState } from 'react';
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

// Observa as métricas de scroll do trilho e devolve quais bordas FÍSICAS têm
// conteúdo cortado (left/right, para os véus) + se ainda há conteúdo na
// direção de leitura (atEnd/isRtl, para o chevron). RTL-correto (UX-M17):
// em árabe o Chrome anda scrollLeft de 0 para NEGATIVO, então a posição usa
// Math.abs e o mapeamento início/fim -> esquerda/direita inverte com a
// direção computada do trilho.
function useRailEdgeFades(railRef) {
  const [edges, setEdges] = useState({
    left: false,
    right: false,
    atEnd: true,
    isRtl: false,
  });

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      const pos = Math.abs(rail.scrollLeft); // 0..max em LTR e RTL
      const isRtl = getComputedStyle(rail).direction === 'rtl';
      const atStart = pos <= 8;
      const atEnd = pos >= max - 8;
      setEdges({
        // Véu esquerdo: há conteúdo escondido do lado FÍSICO esquerdo —
        // em LTR isso é "já rolou" (!atStart); em RTL é "ainda há fim" (!atEnd).
        left: isRtl ? !atEnd : !atStart,
        right: isRtl ? !atStart : !atEnd,
        atEnd,
        isRtl,
      });
    };
    update();
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      rail.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [railRef]);

  return edges;
}

// Atalhos de navegação do trilho (MapaPet, Solone, Bluey, Ilha das Flores) —
// links reais (Next Link/<a href>), operáveis por teclado e antes da
// hidratação. Extraídos do render principal para manter cada função abaixo
// do limite FF2 (100 LOC). O Bluey carrega .mdf-pulse (anel de respiração,
// SOT em globals.css): é um dos dois CTAs que geram receita da plataforma.
function RailShortcuts() {
  return (
    <>
      <Link
        href="/pets"
        className="mdf-steps__pets"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('page.steps.pets_aria')}
      >
        <span aria-hidden="true">🐾</span>
        <span className="mdf-steps__pets-label">{t('cta.pets')}</span>
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
        className="mdf-steps__pets mdf-pulse"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('page.steps.bluey_aria')}
      >
        <span aria-hidden="true">👦👧 Bluey</span>
      </Link>
      <a
        className="mdf-btn mdf-btn--secondary mdf-btn--lg"
        target="_blank"
        rel="noreferrer"
        href="https://www.youtube.com/watch?v=h30BO_6kFNM"
        aria-label={t('page.info.globo_aria')}
      >
        <span className="mdf-btn__emoji" aria-hidden="true">📺</span>
        <span>Ilha das Flores</span>
      </a>
    </>
  );
}

export default function StepsHint({ activeStep = 0 }) {
  useLocale(); // re-render on locale change so t() re-reads
  const railRef = useRef(null);
  const fades = useRailEdgeFades(railRef);

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

  const nudgeForward = () => {
    const rail = railRef.current;
    if (!rail) return;
    // Avança na direção de LEITURA: em RTL o fim fica em scrollLeft mais
    // negativo, então o delta inverte o sinal.
    const dir = fades.isRtl ? -1 : 1;
    rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <aside
      className={
        'mdf-steps' +
        (fades.left ? ' mdf-steps--fade-left' : '') +
        (fades.right ? ' mdf-steps--fade-right' : '')
      }
      role="region"
      aria-label={t('page.steps.region_aria')}
    >
      {/* Trilho de rolagem HORIZONTAL: todos os atalhos vivem num único div que
          é o container de scroll (overflow-x). Mantê-los aqui (e não soltos no
          <aside>) garante o scroll lateral em telas estreitas independente do
          padding/flex do aside — os filhos não encolhem (flex:0 0 auto no CSS),
          então o trilho rola em vez de espremer/cortar os botões. */}
      <div className="mdf-steps__scroll" ref={railRef}>
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
        <RailShortcuts />
      </div>
      {/* Chevron de arraste — reforço APONTÁVEL do véu de gradiente: um véu
          sozinho lê como "a tela acabou" para quem tem pouca familiaridade
          digital. Decorativo para AT/teclado (aria-hidden + tabIndex -1):
          teclado já alcança cada pílula por Tab e o scroll segue o foco.
          Gate por atEnd (direção de leitura), não por lado físico: em RTL o
          "fim" fica à esquerda; o CSS posiciona via inset-inline-end e
          espelha o glifo. */}
      {!fades.atEnd && (
        <button
          type="button"
          className="mdf-steps__nudge"
          aria-hidden="true"
          tabIndex={-1}
          onClick={nudgeForward}
        >
          ›
        </button>
      )}
    </aside>
  );
}
