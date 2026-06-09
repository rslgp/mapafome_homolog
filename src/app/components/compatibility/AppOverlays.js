'use client';

// Floating overlays + sheets rendered as siblings of <main>: tour, FAB,
// report/pin sheets, toasts, list, empty-state, notifications. Extracted
// VERBATIM from App.renderOverlays() (MILESTONE 1 decoupling) into a
// presentational function component. Wrapped in a fragment (no DOM node) so the
// overlays stay direct children of .App in the same render order.
//
// No behavior change: `this.state.X` became `state.X`; each bound method
// (`this.handleCloseTour`, …) and each inline arrow that called `this.setState`
// is passed in via the `handlers` object, defined identically in App.render().
// The visible/EmptyViewportOverlay predicate and every prop are preserved exactly.

import React from 'react';
import GuidedTutorial from './components/ux/GuidedTutorial';
import ReportSheet from './components/ux/ReportSheet';
import PinDetailSheet from './components/ux/PinDetailSheet';
import OfflineToast from './components/ux/OfflineToast';
import ListView from './components/ux/ListView';
import EmptyViewportOverlay from './components/ux/EmptyViewportOverlay';
import NotificationPrefs from './components/ux/NotificationPrefs';

export default function AppOverlays({ state, handlers }) {
    return (
        <>
            <GuidedTutorial
                open={state.tourOpen}
                onClose={handlers.handleCloseTour}
            />

            <button
                type="button"
                className="mdf-fab"
                aria-label="Relatar ponto"
                onClick={handlers.handleOpenReportSheet}
            >
                +
            </button>

            <ReportSheet
                open={state.reportSheetOpen}
                coords={state.reportSheetCoords}
                onClose={handlers.handleCloseReportSheet}
                onPublish={handlers.handlePublishFromSheet}
            />

            <PinDetailSheet
                open={state.pinSheetOpen}
                pin={state.selectedPin}
                userCoords={state.center}
                onClose={handlers.handleClosePinSheet}
                onClaim={handlers.handleClaimPin}
                onMarkAttended={handlers.handleMarkAttended}
            />

            <OfflineToast
                message={state.offlineToast}
                onDismiss={handlers.onDismissOfflineToast}
            />

            <ListView
                open={state.listOpen}
                dataMaps={state.dataMaps}
                userCoords={state.center}
                onSelectPin={handlers.onSelectPinFromList}
                onClose={handlers.onCloseList}
            />

            <EmptyViewportOverlay
                visible={!state.isLoading && Array.isArray(state.dataMaps) && state.dataMaps.length === 0}
                onStartReport={handlers.handleOpenReportSheet}
            />

            <NotificationPrefs
                open={state.notifOpen}
                onClose={handlers.onCloseNotif}
            />
        </>
    );
}
