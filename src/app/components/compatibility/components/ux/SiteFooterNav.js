'use client';

import React from 'react';
import Link from 'next/link';
import './SiteFooterNav.css';
import { t, useLocale } from './strings';

// UX-M16: textual site map at the end of <main> — the last-resort discovery
// surface (a page that ENDS somewhere useful) and a crawlable link block.
// Labels are the product's own page names (the target routes are pt-BR
// content surfaces); the nav's aria-label is translated. Real links,
// keyboard-operable pre-hydration.
const LINKS = [
  { href: '/', label: 'Mapa' },
  { href: '/pets', label: 'MapaPet' },
  { href: '/assinar', label: 'Apoiar' },
  { href: '/iniciativas/cadastrar', label: 'Cadastrar iniciativa' },
  { href: '/imprensa', label: 'Imprensa' },
  { href: '/parceiros', label: 'Parceiros' },
  { href: '/relatorios', label: 'Relatórios' },
  { href: '/privacy', label: 'Privacidade' },
  { href: '/terms', label: 'Termos' },
];

export default function SiteFooterNav() {
  useLocale(); // re-render on locale change so t() re-reads
  return (
    <nav className="mdf-sitenav" aria-label={t('page.footer.nav_aria')}>
      <ul className="mdf-sitenav__list">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="mdf-sitenav__link">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
