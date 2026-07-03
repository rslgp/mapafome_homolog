'use client';

import React from 'react';
import './ux/Header.css';
import mapaFomeMark from '../images/MapaFome_Icons_Blue.svg';
import useInstallPrompt from './ux/useInstallPrompt';
import { t, useLocale } from './ux/strings';
import { INTL_ENABLED } from './intlConfig';
import { getSelectedCountry, subscribe } from './countryStore';
import { flagEmoji } from './countries';
import { resolveHeaderBrand } from './countryBrand';

export default function Header({ rowCountProp, onStartTour, onStartReport }) {
  const { isInstalled, promptInstall } = useInstallPrompt();
  useLocale(); // re-render on locale change so t() re-reads

  // INTL per-country brand layer. resolveHeaderBrand returns null when the flag is
  // OFF, so the render below stays BYTE-IDENTICAL to today (the dark-ship invariant
  // rollbackDrill.test enforces). When ON it tracks the selected country. We watch
  // countryStore the SAME way App.js does (subscribe + forceUpdate), with a proper
  // unsubscribe in the effect cleanup — no subscription leak. The subscription is
  // only wired when the flag is ON (nothing to react to when OFF).
  const [, forceCountryTick] = React.useReducer((n) => n + 1, 0);
  React.useEffect(() => {
    if (!INTL_ENABLED) return undefined;
    const unsubscribe = subscribe(() => forceCountryTick());
    return unsubscribe; // cleanup on unmount -> no leak
  }, []);
  const brand = INTL_ENABLED ? resolveHeaderBrand(INTL_ENABLED, getSelectedCountry()) : null;

  const handleInstallClick = async () => {
    const result = await promptInstall();
    if (result === 'ios') {
      window.alert(t('page.header.install_ios'));
    } else if (result === 'unavailable') {
      window.alert(t('page.header.install_other'));
    }
  };

  const hasCount =
    typeof rowCountProp === 'number' ||
    (typeof rowCountProp === 'string' && rowCountProp !== '');

  return (
    <header className="mdf-header" role="banner">
      <a href="#mdf-main" className="mdf-skip-link">
        {t('page.header.skip_to_map')}
      </a>
      <div className="mdf-header__inner">
        <div
          className="mdf-header__brand"
          // Accent flows ONLY through a layered --mdf-brand override; never a hex in
          // JSX (LBR-07 / the color SOT). Applied only when the brand layer supplies
          // a REAL hue. brand.accent is null both when the flag is OFF and when the
          // country's hue is still the unfilled TODO sentinel, so the base brand
          // (#D64545) shows through and an unfilled hue can never break the build.
          style={brand && brand.accent ? { '--mdf-brand': brand.accent } : undefined}
        >
          <img
            src={mapaFomeMark.src || mapaFomeMark}
            className="mdf-header__mark"
            alt=""
            aria-hidden="true"
          />
          {brand && brand.showFlagBadge && (
            <span className="mdf-header__flag-badge" aria-hidden="true">
              {flagEmoji(brand.code)}
            </span>
          )}
          <span className="mdf-header__wordmark">
            <span className="mdf-header__wordmark-main">
              {/* Canonical wordmark falls back to the existing string SOT so it is
                * never duplicated; a genuinely different per-country wordmark (none
                * today) would render brand.wordmark verbatim. */}
              {brand && !brand.isCanonicalWordmark ? brand.wordmark : t('page.header.wordmark')}
            </span>
            {brand && brand.taglineKey && (
              <span className="mdf-header__tagline">{t(brand.taglineKey)}</span>
            )}
            <span className="mdf-header__wordmark-extra">
              <a
                className="mdf-header__backup"
                href="https://rslgp.github.io/mapafome"
              >
                {t('page.header.backup_link')}
              </a>
            </span>
          </span>
        </div>

        {hasCount && (
          <div className="mdf-header__meta" aria-live="polite">
            <span className="mdf-header__count">
              <strong>{rowCountProp}</strong>
              <span className="mdf-header__count-full">{t('page.header.count_full')}</span>
              <span className="mdf-header__count-short" aria-hidden="true">{t('page.header.count_short')}</span>
            </span>
          </div>
        )}

        <div className="mdf-header__actions">
          {onStartReport && (
            <button
              type="button"
              className="mdf-header__report"
              onClick={onStartReport}
              aria-label={t('page.header.report_aria')}
            >
              {t('cta.report')}
            </button>
          )}
          {onStartTour && (
            <button
              type="button"
              className="mdf-header__tour"
              onClick={onStartTour}
              aria-label={t('page.header.tour_aria')}
            >
              <span className="mdf-header__tour-label">{t('cta.help')}</span>
              <span className="mdf-header__tour-icon" aria-hidden="true">?</span>
            </button>
          )}
          
          {!isInstalled && (
            <button
              type="button"
              className="mdf-header__install"
              onClick={handleInstallClick}
              aria-label={t('page.header.install_aria')}
            >
              <svg
                className="mdf-header__install-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.42 1.42l-4 4a1 1 0 0 1-1.42 0l-4-4a1 1 0 0 1 1.42-1.42l2.29 2.3V4a1 1 0 0 1 1-1Z" />
                <path fill="currentColor" d="M5 15a1 1 0 0 1 1 1v3h12v-3a1 1 0 1 1 2 0v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z" />
              </svg>
              <span className="mdf-header__install-label">{t('page.header.install_label')}</span>
            </button>
          )}
          <a
            className="mdf-header__donate mdf-pulse"
            href="./assinar"
            target="_blank"
            rel="noreferrer"
            aria-label={t('page.header.donate_aria')}
            title={t('page.header.donate_aria')}
          >
            <img
              className="mdf-header__donate-icon"
              src="/presskit/emoji_heart.png"
              alt=""
              width="22"
              height="22"
            />
            <span className="mdf-header__donate-label">{t('page.header.donate_label')}</span>
          </a>
        </div>
      </div>
    </header>
  );
}
