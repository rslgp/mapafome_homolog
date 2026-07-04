'use client';

// Mount / unmount lifecycle wiring extracted VERBATIM from App.componentDidMount
// and App.componentWillUnmount to keep App.js under the FF1 file-LOC budget and
// componentDidMount under the FF2 function-LOC budget. Same precedent as
// appMainBootstrap.js (runMain / installDebugHelpers) and appPinActions.js: this
// module is a pure function of its inputs — it takes the component instance as
// `self` and its module-level collaborators as an explicit `deps` object, so it
// never imports the store/flag/singletons itself beyond the shared UX seams.
//
// NO behavior change: each body below is the original method body, copied
// line-for-line, with the only edit being that App.js's module-scope singletons
// (doc / envVariables / aes / sheetsGetSheet) now arrive via `deps.bootstrapDeps`
// and `this` → `self`. Everything the mount sequence did — the country resolver
// wiring, the country-change subscription, the live locale switch, the urgency
// ticker, the SW registration + online-flush bind, the offline-queue toast, the
// first-visit tour timer, the geolocation fix + geofence warm-up, and the debug
// helpers — happens in the SAME order it did inline. The UX-M26 retry contract is
// preserved exactly: `self._bootstrapDeps` is still assigned here so
// handleRetryLoad can re-run runMain.
//
// deps shape:
//   {
//     bootstrapDeps: { doc, envVariables, aes, sheetsGetSheet }, // for runMain / debug
//     envVariables,                     // read in the geolocation success/failure paths
//     setActiveCountryResolver,         // INTL M1 composition-root wiring
//     activeCountryFor, INTL_ENABLED, countryStore, // the active-country resolver
//     countryStore,                     // .subscribe for the country-change refilter
//     hasActedOnPin,                    // M8 notifications entry unlock
//     registerServiceWorker, bindOnlineFlush, queueSize, // M7 SW + offline flush
//     hasSeenTour,                      // first-visit guided tour gate
//     runMain, installDebugHelpers,     // appMainBootstrap entry points
//   }

// Wires everything App.componentDidMount used to wire, in the same order, taking
// the component (`self`) and its collaborators (`deps`). Returns nothing — its
// effect is the subscriptions / timers / handles it stashes on `self` (the SAME
// fields componentWillUnmount tears down). Called once from the thin
// componentDidMount wrapper in App.js.
export function installLifecycle(self, deps) {
  const {
    bootstrapDeps,
    envVariables,
    setActiveCountryResolver,
    activeCountryFor,
    INTL_ENABLED,
    countryStore,
    hasActedOnPin,
    registerServiceWorker,
    bindOnlineFlush,
    queueSize,
    hasSeenTour,
    runMain,
    installDebugHelpers,
  } = deps;

  // INTL M1 (§4.2) — composition root: wire the POJO's injected country
  // accessor here (client-only, after mount, where window/localStorage exist).
  // variaveisAmbiente stays import-free of the store/flag; it learns the active
  // publish country through this single resolver. With INTL_ENABLED OFF (the
  // dark-ship default) activeCountryFor returns 'br', so dentroLimites is
  // byte-identical to today. This is the only place the store+flag meet the
  // pure POJO.
  setActiveCountryResolver(() => activeCountryFor(INTL_ENABLED, countryStore));

  // INTL — on a country change (the flag control's pick() recenters the camera
  // but does NOT touch markers), re-derive the marker set from the cached rows.
  // The store only notifies on an ACTUAL code change, and with the INTL flag OFF
  // the picker never mounts, so this subscription is effectively inert on the OFF
  // path — _refilterForCountry resolves activeCountryFor → 'br' regardless. The
  // callback arg is intentionally ignored: we re-resolve the active country the
  // SAME way the bootstrap does so OFF behavior stays byte-identical. Unbound in
  // componentWillUnmount (no subscription leak).
  self._unbindCountry = countryStore.subscribe(() => self._refilterForCountry());

  // INTL — INSTANT language switch. App is a class component that renders ~11
  // t() strings (the map shell: alerts, buttons, error copy). t() resolves at
  // render time against the active locale, but a manual language pick only
  // dispatches the 'mdf-locale-change' CustomEvent (setLocale) — the small
  // useLocale() hook consumers re-render, but THIS class component does not
  // subscribe to anything that re-renders it, so its strings stayed stale until
  // a reload. Listen for the event and forceUpdate() so the WHOLE site (shell
  // included) switches language live, with no reload. Removed in unmount.
  if (typeof window !== 'undefined') {
    self._onLocaleChange = () => self.forceUpdate();
    window.addEventListener('mdf-locale-change', self._onLocaleChange);
  }

  // M2 — tick once a minute so the context bar and marker urgency re-derive
  // without any backend push. Client clock is the source of truth here; a
  // server-time correction is deferred until real drift is observed.
  self._urgencyTicker = setInterval(() => {
    self.setState({ nowTick: Date.now() });
  }, 60 * 1000);

  // M8 — prior acted-on-pin unlocks the notifications entry.
  if (hasActedOnPin()) self.setState({ canOpenNotif: true });

  // M7 — register SW for offline shell + tile caching, then attach an
  // online-flush handler so queued publishes drain opportunistically.
  registerServiceWorker();
  self._unbindOnlineFlush = bindOnlineFlush(
    (payload) => self.writePinToSheets(payload),
    {
      onResult: ({ succeeded, failed }) => {
        if (succeeded > 0) {
          self.setState({ offlineToast: `${succeeded} ponto${succeeded > 1 ? 's' : ''} publicado${succeeded > 1 ? 's' : ''} agora.` });
        } else if (failed > 0) {
          self.setState({ offlineToast: 'Ainda não foi possível enviar os pontos salvos. Tentaremos de novo quando voltar a conexão.' });
        }
      },
    },
  );
  queueSize().then((n) => {
    if (n > 0) self.setState({ offlineToast: `${n} ponto${n > 1 ? 's' : ''} aguardando conexão.` });
  });

  // First-visit guided tutorial — cookie-gated, contextual, never blocks the map.
  // Defer one tick so the DOM nodes referenced by tour stops exist.
  if (typeof window !== 'undefined' && !hasSeenTour()) {
    setTimeout(() => self.setState({ tourOpen: true }), 600);
  }

  // Google Sheets API
  // Based on https://github.com/theoephraim/node-google-spreadsheet

  // Collaborators passed into the extracted bootstrap/debug helpers
  // (appMainBootstrap.js) so that module stays a pure function of its inputs.
  self._bootstrapDeps = bootstrapDeps; // UX-M26: retry re-runs this bootstrap

  console.log('[geo] requesting device location...');
  navigator.geolocation.getCurrentPosition(
    function (position) {
      const coords = [position.coords.latitude, position.coords.longitude];
      console.log('[geo] SUCCESS - device coords:', coords);
      envVariables.currentLocation = coords;
      // LOCATION-GEOFENCE (flag ON only): kick off the physical-country resolve
      // off the FIRST real device fix, so the synchronous click handler later reads
      // a cached code instead of blocking on the network. Not awaited for runMain
      // (it only warms the cache; the click path still awaits/falls back), but once
      // it settles we refresh eligibility so the UX gate lights up with the GPS leg.
      if (self._physicalCountryResolver) {
        self._physicalCountryResolver
          .resolve(coords)
          .catch(function () {})
          .finally(function () { self._refreshGeofenceEligibility(); });
      }
      self.setState({ center: coords }, function () {
        console.log('[geo] state.center after setState:', self.state.center);
        runMain(self, bootstrapDeps);
      });
    },
    function (err) {
      console.warn('[geo] FAILED (code=' + err.code + '):', err.message, '- using default center:', self.state.center);
      // LOCATION-GEOFENCE: GPS denied/unavailable. Refresh eligibility so the gate
      // settles on its GPS-denied verdict — the IP-fallback path makes it eligible
      // iff the IP leg is on AND a country came back; otherwise it stays ineligible.
      self._refreshGeofenceEligibility();
      runMain(self, bootstrapDeps);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );

  installDebugHelpers(self, bootstrapDeps);
}

// The teardown half of the lifecycle: clears the urgency ticker, unbinds the
// online-flush + country subscriptions, and removes the locale-change listener —
// the SAME fields installLifecycle stashed on `self`. Copied verbatim from
// App.componentWillUnmount so both halves of the mount/unmount pair live in one
// cohesive module (no leaked interval / subscription / listener).
export function teardownLifecycle(self) {
  if (self._urgencyTicker) clearInterval(self._urgencyTicker);
  if (self._unbindOnlineFlush) self._unbindOnlineFlush();
  if (self._unbindCountry) self._unbindCountry();
  if (self._onLocaleChange && typeof window !== 'undefined') {
    window.removeEventListener('mdf-locale-change', self._onLocaleChange);
  }
}
