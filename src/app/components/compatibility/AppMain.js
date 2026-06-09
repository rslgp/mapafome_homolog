'use client';

// The in-flow page content (<main>): the ordered column of sections. Extracted
// VERBATIM from App.renderMain() (MILESTONE 1 decoupling) into a presentational
// function component — same JSX, ordering, and comments. It renders AppMapGrid
// in place of the old `this.renderMapGrid()` call and receives App's `state`,
// the handler callbacks, and the dropdown refs as props.
//
// No behavior change: `this.state.X` became `state.X`; the single inline
// `onOpenList={() => this.setState({ listOpen: true })}` became
// `handlers.onOpenList`, defined identically in App.render(). Section order and
// every comment are preserved exactly.

import React from 'react';
import PinReadout from './components/PinReadout';
import LiveAnnouncer from './components/ux/LiveAnnouncer';
import ViewMoreCue from './components/ux/ViewMoreCue';
import TapDebugOverlay from './components/_debug/TapDebugOverlay';
import ContextBar from './components/ux/ContextBar';
import InfoPanel from './components/InfoPanel';
import VersionFooter from './components/VersionFooter';
import AppMapGrid from './AppMapGrid';

export default function AppMain({ state, handlers, refs }) {
    return (
        <main id="mdf-main" className="mdf-main">
            {/* TV-3 + TV-6 + TV-7 — pin readout pill (hoisted above ContextBar
                on user request 2026-04-30): shows resolved coords of the
                dropped marker and the Limpar reset button. Renders null
                when no marker is placed, so it costs zero vertical space
                until the user taps. Placing it ABOVE the ContextBar makes
                the user's top-priority signal — "this is where Confirmar
                ponto will publish" — the most prominent piece of UI as
                soon as a tap registers. */}
            {/* ─── Page layout (SRP, v5 § solid_quick.SRP + refactoring_patterns.move_function) ───
                Each numbered section below is a sibling at this single level;
                reorder by moving its block within this scope (no other file to
                edit). The Grid owns ONE responsibility (the 2-column map+controls
                row); every other section is independently positioned. */}

            {/* 1. Tap-coord readout — only renders after a tap. */}
            <PinReadout />

            {/* 2. Screen-reader status region. */}
            <LiveAnnouncer dataMaps={state.dataMaps} />

            {/* 3. Map + controls — the only Grid in this layout. SRP:
                  owns the responsive 2-column map/controls row, nothing else. */}
            <AppMapGrid state={state} handlers={handlers} refs={refs} />

            {/* 4. Scroll affordance — signals there's content below the map. */}
            <ViewMoreCue />

            {/* 5. Diagnostic overlay — opt-in via ?debug=tap. */}
            <TapDebugOverlay />

            {/* 6. Ambient context — point counts + Lista button. */}
            <ContextBar
                key={`ctx-${state.nowTick}`}
                dataMaps={state.dataMaps}
                userCoords={state.center}
                onOpenList={handlers.onOpenList}
            />

            {/* 7. Legend / info surface (#MoreInfo). */}
            <InfoPanel rowCount={state.rowCount} />

            {/* 8. Version footer — last child of <main>. Renders nothing
                  until /version.json resolves. SRP: shows ONLY the build
                  identifier (no other footer concerns). */}
            <VersionFooter />
        </main>
    );
}
