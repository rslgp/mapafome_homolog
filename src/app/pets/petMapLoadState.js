// petMapLoadState.js — PET-M20 SOT for the three explicit map-load states +
// the one-time first-run hint flag. PURE + SSR-guarded; no rendering here.
//
// WHY a separate module: PetsApp.js mounts Leaflet and is EXCLUDED from vitest
// coverage (jsdom can't load the map). The load-state DECISION and the
// localStorage hint flag are the testable logic this milestone adds, so they
// live here — a pure function + two thin window-guarded helpers — and PetsApp
// just wires them. This keeps PET-M20's acceptance lines unit-gated (coverage
// include is src/app/pets/**) without dragging Leaflet into jsdom.
//
// The closure-pin identity (PET-M20 §4: "recentra/realça o pin recém-criado")
// reuses petCoordsKey (PET-M18 SOT) — see resolveClosurePin below; we do NOT
// invent a second coords-identity here (one SOT, DRY).

import { petCoordsKey, findPetByCoordsKey } from './petDomain';

// The four discernible states of the map surface (Salen & Zimmerman: a state
// change must be DISCERNIBLE). Ids are stable strings the UI switches on.
export const PET_MAP_LOAD_STATE = {
  LOADING: 'loading', // fetchPets() in flight — a calm busy affordance (aria-busy/skeleton)
  ERROR: 'error',     // fetchPets() rejected — calm copy + a >=44px "Tentar de novo"
  EMPTY: 'empty',     // loaded, but zero pets — hopeful "seja o primeiro a ajudar"
  READY: 'ready',     // loaded with >=1 pet — the normal map/list
};

// PURE decision: given the load flags, which state is the surface in? Order of
// precedence is deliberate and is what makes the three states DISTINCT
// (acceptance line 1 — "distinct from empty and error"):
//   1. ERROR wins over everything once a fetch has failed (the user must see the
//      retry path; a stale empty/ready must not mask a real failure).
//   2. LOADING while the fetch is still in flight AND nothing has arrived yet.
//   3. EMPTY when the load finished with zero visible pets.
//   4. READY otherwise (>=1 pet to show).
//
// `count` is the VISIBLE pet count (post-filter/age in PetsApp) — the empty
// state is about "nothing to show here", which composes with M7 filter / M12
// age-prune without this module knowing about them (it just gets the number).
// Defensive: a non-number count is treated as 0 (degrade to empty, never throw).
export function mapLoadState({ loading, error, count } = {}) {
  if (error) return PET_MAP_LOAD_STATE.ERROR;
  const n = Number.isFinite(count) ? count : 0;
  if (loading) return PET_MAP_LOAD_STATE.LOADING;
  if (n <= 0) return PET_MAP_LOAD_STATE.EMPTY;
  return PET_MAP_LOAD_STATE.READY;
}

// ─── PET-M20 — one-time first-visit hint (localStorage flag, SSR-guarded) ─────
//
// The hint ("toque no mapa onde viu o pet, depois Relatar um pet") is shown ONCE
// per browser and dismissed forever. We persist a single boolean-ish flag. This
// mirrors the readStoredView/handleSetView discipline already in PetsApp: guard
// typeof window (/pets is ssr:false, but defensive at zero cost) AND wrap the
// localStorage access in try/catch (private mode / quota must never crash the
// page — a missing flag just means "show the hint", the safe default).
export const PET_FIRST_RUN_HINT_KEY = 'mapapet:hint-seen';
const HINT_SEEN_VALUE = '1';

// Has the first-run hint already been dismissed? true => do NOT show it.
// Defensive: any failure (no window, blocked storage) returns false → the hint
// shows. Showing a calm hint to a returning user is a far smaller harm than
// crashing, so the failure mode leans toward "show".
export function readFirstRunHintSeen() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PET_FIRST_RUN_HINT_KEY) === HINT_SEEN_VALUE;
  } catch (_e) {
    return false;
  }
}

// Persist that the hint was dismissed. Same SSR/quota guard — persistence is a
// comfort, not a requirement: if it fails, the hint simply shows again next
// visit (never a crash). Returns nothing; the caller flips local state for the
// current session regardless of whether the write succeeded.
export function markFirstRunHintSeen() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PET_FIRST_RUN_HINT_KEY, HINT_SEEN_VALUE);
  } catch (_e) {
    /* storage unavailable: the hint will reappear next visit — acceptable */
  }
}

// ─── PET-M20 — post-publish CLOSURE pin identity (reuses PET-M18 petCoordsKey) ─
//
// After a successful publish, the closure micro-state must "recentra/realça o pin
// recém-criado" (PET_CURVE §4.1). We identify that just-dropped pin by its
// coords key — the SAME PII-free identity the deep link (M18) uses — so the
// closure and a shared link agree on "which pin". PURE: takes the publish coords
// and the current pets list, returns { coordsKey, pet } or null when the coords
// are unusable (degrade calmly; the closure can still confirm without a pin to
// highlight). Reuses petCoordsKey + findPetByCoordsKey (no second coords SOT).
export function resolveClosurePin(coords, pets) {
  const coordsKey = petCoordsKey(coords);
  if (!coordsKey) return null;
  const list = Array.isArray(pets) ? pets : [];
  const pet = findPetByCoordsKey(list, coordsKey);
  return { coordsKey, coords, pet: pet || null };
}

// ─── PET-M8 — preferência de visão (mapa | lista), persistida ─────────────────
// As DUAS visões alternáveis do /pets. Ids estáveis (vão pro localStorage); a SOT
// da forma da preferência mora aqui (lifted de PetsApp). Vive neste módulo junto
// do readFirstRunHintSeen/markFirstRunHintSeen porque é a MESMA disciplina —
// leitura window-guarded de uma preferência persistida — e PetsApp (excluído da
// cobertura por montar Leaflet) só fica com o wiring. readStoredView agora é
// unit-testável aqui.
export const PET_VIEW = { MAP: 'map', LIST: 'list' };
// Chave do localStorage onde a visão escolhida persiste entre sessões — um usuário
// que prefere a lista (ex.: leitor de tela) não reescolhe a cada visita.
export const PET_VIEW_STORAGE_KEY = 'mapapet:view';

// Lê a visão persistida (uma vez, no boundary client). Guarda de SSR/no-window
// (/pets é ssr:false, mas defensivo, custo zero) e de localStorage indisponível
// (modo privado/quota). Default = MAPA (a visão primária). PURO o suficiente para
// rodar num inicializador lazy de useState (não num effect).
export function readStoredView() {
  if (typeof window === 'undefined') return PET_VIEW.MAP;
  try {
    const v = window.localStorage.getItem(PET_VIEW_STORAGE_KEY);
    return v === PET_VIEW.LIST ? PET_VIEW.LIST : PET_VIEW.MAP;
  } catch (_e) {
    return PET_VIEW.MAP;
  }
}
