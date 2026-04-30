'use client';

// VersionFooter — single-responsibility component (v5 § solid_quick.SRP):
// fetches /version.json and displays the current build identifier as the
// last visible element on the page.
//
// Mounted in App.js AFTER InfoPanel so it sits at the very bottom of the
// document (last child of <main>). Renders nothing until the fetch resolves
// — a missing /version.json (dev mode without a stamp run, or a deploy
// without the prebuild hook) collapses the component to null instead of
// showing an ugly "v: —".
//
// /version.json is rewritten on every `npm run build` by
// scripts/stamp-sw-version.mjs so the value here ALWAYS matches the
// SW_VERSION baked into public/sw.js. Useful for:
//   • bug reports — users can copy "v0.1.0-1777569492535-60197a3"
//   • device QA — confirm the broken Samsungs are running the new build
//   • support — paste-able evidence of which deploy a user is on

import React, { useEffect, useState } from 'react';
import './VersionFooter.css';

const VersionFooter = () => {
    const [version, setVersion] = useState(null);

    useEffect(() => {
        if (typeof fetch !== 'function') return;
        fetch('/version.json', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (j && j.version) setVersion(j.version); })
            .catch(() => { /* dev / pre-stamp — render nothing */ });
    }, []);

    if (!version) return null;

    return (
        <footer className="mdf-version-footer" aria-label="Versão do aplicativo">
            <span className="mdf-version-footer__label">v{version}</span>
        </footer>
    );
};

export default VersionFooter;
