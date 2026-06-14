// infoPanelContent.js — static content data for the InfoPanel, extracted from
// InfoPanel.js (SRP: presentation vs content). The color-legend rows, the
// acknowledgements list, and the hunger-timeline table rows. Render-agnostic
// DATA — but ACKNOWLEDGEMENTS embeds JSX (a fragment with <a> links), so this
// module imports React and stays a .js with JSX; it is data-shaped, not strictly
// serializable. The legend icon refs (coffeeBean/hub/green/red) move here with
// LEGEND. Internal to the component folder — InfoPanel imports these by name; no
// barrel needed (InfoPanel's own default export is unchanged).

import React from 'react';
import { bean as coffeeBean, hub, green, red } from './image/svgHandler';

/* Legend layout (per design_brief.yaml § visual_system.markers + Foundation 4):
 *   ──── A ────   yellow  (full row — primary user case: pessoas em vulnerabilidade)
 *   ──── A ────   blue    (full row — iniciativas que distribuem)
 *   ── B ── B ──  red | green (side by side — formas de prover alimento)
 * Each chip pairs color with icon + dark text — color is never the sole signal.
 */
// label/desc held as i18n KEYS resolved via t() at render in InfoPanel (not here
// at module load), so they follow a language switch. icon/span/chipClass literal.
export const LEGEND = [
  {
    key: 'yellow',
    chipClass: 'yellowHub',
    icon: coffeeBean,
    labelKey: 'page.legend.yellow_label',
    descKey: 'page.legend.yellow_desc',
    span: 'wide',
  },
  {
    key: 'blue',
    chipClass: 'blueHub',
    icon: hub,
    labelKey: 'page.legend.blue_label',
    descKey: 'page.legend.blue_desc',
    span: 'wide',
  },
  {
    key: 'red',
    chipClass: 'redHub',
    icon: red,
    labelKey: 'page.legend.red_label',
    descKey: 'page.legend.red_desc',
    span: 'half',
  },
  {
    key: 'green',
    chipClass: 'greenHub',
    icon: green,
    labelKey: 'page.legend.green_label',
    descKey: 'page.legend.green_desc',
    span: 'half',
  },
];

// ACKNOWLEDGEMENTS hold i18n KEYS resolved via t() at render in InfoPanel. The
// 2nd item carries inline <a> links, so it is rendered SPECIALLY by InfoPanel
// (docLeadKey + the two anchors); the rest are plain text keys. `links` marks it.
export const ACKNOWLEDGEMENTS = [
  { key: 'page.thanks.a0' },
  {
    docLeadKey: 'page.thanks.doc_lead',
    links: [
      { href: 'https://www.youtube.com/watch?v=h30BO_6kFNM', label: 'Ilha das Flores' },
      { href: 'https://drive.google.com/file/d/1YmaBTFgVV67k44l5EyxjEXSNTVb5ATjS/view?usp=drive_link', label: 'backup' },
    ],
  },
  { key: 'page.thanks.a1' },
  { key: 'page.thanks.a2' },
  { key: 'page.thanks.a3' },
  { key: 'page.thanks.a4' },
  { key: 'page.thanks.a5' },
  { key: 'page.thanks.a6' },
  { key: 'page.thanks.a7' },
  { key: 'page.thanks.a8' },
];

// time/conseq held as keys resolved at render; risk is a literal CSS/data class.
export const HUNGER_TIMELINE = [
  { timeKey: 'page.timeline.t0_time',  conseqKey: 'page.timeline.t0_conseq',  risk: 'nenhum' },
  { timeKey: 'page.timeline.t1_time',  conseqKey: 'page.timeline.t1_conseq',  risk: 'nenhum' },
  { timeKey: 'page.timeline.t2_time',  conseqKey: 'page.timeline.t2_conseq',  risk: 'baixo' },
  { timeKey: 'page.timeline.t3_time',  conseqKey: 'page.timeline.t3_conseq',  risk: 'moderado' },
  { timeKey: 'page.timeline.t4_time',  conseqKey: 'page.timeline.t4_conseq',  risk: 'moderado' },
  { timeKey: 'page.timeline.t5_time',  conseqKey: 'page.timeline.t5_conseq',  risk: 'alto' },
  { timeKey: 'page.timeline.t6_time',  conseqKey: 'page.timeline.t6_conseq',  risk: 'alto' },
  { timeKey: 'page.timeline.t7_time',  conseqKey: 'page.timeline.t7_conseq',  risk: 'alto' },
  { timeKey: 'page.timeline.t8_time',  conseqKey: 'page.timeline.t8_conseq',  risk: 'muito alto' },
  { timeKey: 'page.timeline.t9_time',  conseqKey: 'page.timeline.t9_conseq',  risk: 'extremo' },
  { timeKey: 'page.timeline.t10_time', conseqKey: 'page.timeline.t10_conseq', risk: 'extremo' },
];
