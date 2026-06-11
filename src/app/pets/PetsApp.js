'use client';

// PetsApp — composição do /pets (fork enxuto da infra do MAPA FOME).
//
// Junta as peças produzidas pelos especialistas:
//   • PetMap        — mapa Leaflet enxuto + camada de marcadores de pet
//   • PetReportSheet — bottom-sheet de "Reportar um pet" (status único + campos)
//   • PetDetailSheet — bottom-sheet de detalhe de um pet
//   • petsData       — busca/publica na MESMA planilha, discriminada por kind:'pet'
//
// Fluxo: tocar no mapa "lembra" o local (handlePinDropped grava reportCoords e
// solta o pin); o botão "Relatar um pet" abre o sheet ancorado nesse local
// (ou no GPS / centro padrão). Publicar adiciona o pet ao estado de forma
// otimista para o marcador aparecer na hora.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import './petPalette.css';
import './pets.css';
import Header from '../components/compatibility/components/header';
import PetMap from './PetMap';
import PetFilterBar from './PetFilterBar';
import PetListView from './PetListView';
import PetReportSheet from './PetReportSheet';
import PetDetailSheet from './PetDetailSheet';
import PetMapLoadStates from './PetMapLoadStates';
import PetPublishClosure from './PetPublishClosure';
import PetFirstRunHint from './PetFirstRunHint';
import { fetchPets, publishPet } from './petsData';
import {
  PET_MAP_LOAD_STATE,
  mapLoadState,
  readFirstRunHintSeen,
  markFirstRunHintSeen,
  resolveClosurePin,
} from './petMapLoadState';
import {
  classifyPublishFailure,
  shouldQueuePublishFailure,
  PET_PUBLISH_FAILURE,
  PET_CLOSURE_REASON,
  defaultPetFilter,
  filterPets,
  togglePetFilterValue,
  activePetsByAge,
  parsePetDeepLinkParam,
  findPetByCoordsKey,
  findPossibleMatches,
} from './petDomain';
import {
  enqueue as enqueuePetPublish,
  bindOnlineFlush as bindPetOnlineFlush,
} from './petPublishQueue';
import { trackError } from '../components/compatibility/components/ux/analytics';
// PET-M21 — emissores do FUNIL de observabilidade (sobre o seam analytics.track
// existente; ver petAnalytics.js). NENHUM carrega PII: cada um monta o payload por
// allow-list de campos enumerados/codificados da SOT petDomain. Mantém os eventos
// de pet num módulo pets/* (não infla analytics.js), como manda a PET-M21.
import {
  trackReportStarted,
  trackReportPublished,
  trackReportFailed,
  trackPetOpened,
  trackMarkedReunido,
  trackEncerrouBusca,
} from './petAnalytics';

// Mesmo centro padrão do mapa de fome (Recife) até o GPS responder.
const DEFAULT_CENTER = [-8.0671132, -34.8766719];

// PET-M8 — as DUAS visões alternáveis do /pets (mapa | lista). Ids estáveis (vão
// pro localStorage); a SOT da forma da preferência mora aqui.
const PET_VIEW = { MAP: 'map', LIST: 'list' };
// Chave do localStorage onde a visão escolhida persiste entre sessões — um usuário
// que prefere a lista (ex.: leitor de tela) não reescolhe a cada visita.
const PET_VIEW_STORAGE_KEY = 'mapapet:view';

// Lê a visão persistida (uma vez, no boundary client). Guarda de SSR/no-window
// (/pets é ssr:false, mas defensivo, custo zero) e de localStorage indisponível
// (modo privado/quota). Default = MAPA (a visão primária). PURO o suficiente para
// rodar num inicializador lazy de useState (não num effect).
function readStoredView() {
  if (typeof window === 'undefined') return PET_VIEW.MAP;
  try {
    const v = window.localStorage.getItem(PET_VIEW_STORAGE_KEY);
    return v === PET_VIEW.LIST ? PET_VIEW.LIST : PET_VIEW.MAP;
  } catch (_e) {
    return PET_VIEW.MAP;
  }
}

// Erro classificado de publicação (PET-M1). Carrega o `reasonCode` estável
// (PET_PUBLISH_FAILURE.*) para o PetReportSheet escolher a cópia calma certa —
// sem o sheet ter de re-classificar a causa. `queued:true` quando o relato já
// foi guardado na fila offline, então a cópia pode reassegurar em vez de pedir
// "tente de novo".
class PetPublishError extends Error {
  constructor(reasonCode, queued, cause) {
    super(`pet publish failed: ${reasonCode}`);
    this.name = 'PetPublishError';
    this.reasonCode = reasonCode;
    this.queued = queued;
    this.cause = cause;
  }
}

function isOfflineNow() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export default function PetsApp() {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  // PET-M8 — o `center` arranca no DEFAULT_CENTER (Recife) só para o mapa ter um
  // ponto inicial; isso NÃO significa que o GPS do usuário respondeu. A ordenação
  // por DISTÂNCIA da lista só vale quando há GPS REAL — por isso um flag separado
  // que vira true só no callback de sucesso da geolocalização. Enquanto false, a
  // lista cai na ordenação por RECÊNCIA (acceptance 2), em vez de medir distância
  // a partir de um centro padrão que não é "perto de mim".
  const [hasGps, setHasGps] = useState(false);
  const [pets, setPets] = useState([]);
  // PET-M8 — visão atual (mapa | lista), persistida no localStorage. Inicializador
  // LAZY (roda uma vez no mount, não num effect) lê a preferência salva — espelha
  // a disciplina do deepLinkKey abaixo (ler no boundary, sem set-state-in-effect).
  const [view, setView] = useState(readStoredView);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCoords, setReportCoords] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [loadError, setLoadError] = useState(null);
  // PET-M20 — três estados EXPLÍCITOS de carga do mapa (loading | error | empty |
  // ready). `loading` arranca TRUE: o 1º paint mostra a afordância calma de
  // carregamento (skeleton aria-busy), não um mapa vazio que parece "sem pets".
  // O effect de carga abaixo o vira false (sucesso/erro). O estado DERIVADO
  // (mapLoadState) combina loading + loadError + a contagem visível.
  const [loading, setLoading] = useState(true);
  // PET-M20 — micro-estado de FECHAMENTO pós-publicação (PET_CURVE §4). Abre
  // após um publish bem-sucedido; o pin recém-criado é identificado por
  // resolveClosurePin (reusa petCoordsKey do M18) e o mapa é recentrado nele —
  // a confirmação é ESPACIAL (recentro), não só um toast abstrato.
  const [closureOpen, setClosureOpen] = useState(false);
  // PET-M20 — dica de PRIMEIRA visita (uma vez, flag no localStorage). Inicializador
  // LAZY (roda no mount, não num effect) lê o flag persistido — mesma disciplina do
  // readStoredView/deepLinkKey acima (ler no boundary, sem set-state-in-effect).
  // Mostra a dica se AINDA não foi vista; some para sempre ao dispensar.
  const [hintOpen, setHintOpen] = useState(() => !readFirstRunHintSeen());
  // PET-M7 — estado do filtro do mapa. Mora AQUI (dono de `pets`); a barra de
  // filtro só reporta toggles e a contagem é derivada por filterPets. Estado
  // inicial = filtro vazio (defaultPetFilter) → todos os pets aparecem.
  const [filter, setFilter] = useState(defaultPetFilter);
  // PET-M12 — relógio para a EXCLUSÃO por idade. Date.now() é IMPURO e não pode
  // rodar no corpo do render (react-hooks/purity), então o relógio entra por um
  // effect/ref — exatamente o que o comentário do nowMs do M7 já prometia. Iniciado
  // em 0 (nenhum pet arquivado até o effect rodar, no 1º paint: a idade contra a
  // época é negativa → dentro da janela), depois carimbado uma vez na carga inicial
  // (o limiar é de ~90 dias — granularidade de dias; não precisamos de um relógio
  // que tique a cada render). O predicado activePetsByAge continua PURO: o nowMs é
  // injetado, não consultado lá dentro. O setState mora num callback assíncrono
  // (dentro do effect de carga abaixo), nunca no corpo síncrono do effect.
  const [nowMs, setNowMs] = useState(0);

  // PET-M18 — deep link de UM pet (?pet=<coordsKey>).
  //
  // O param CRU é lido UMA vez, no boundary client, por um INICIALIZADOR LAZY de
  // useState (uma função, roda só na 1ª montagem) — NÃO num effect. Ler no
  // inicializador evita o react-hooks/set-state-in-effect (nenhum setState
  // síncrono num corpo de effect) e é a fonte-no-mundo correta: o param já existe
  // no mount, não é um sistema externo que muda com o tempo. Guarda de SSR/
  // no-window: /pets é ssr:false (page.js faz dynamic import), mas checamos typeof
  // window mesmo assim — defensivo, custo zero. parsePetDeepLinkParam é PURO
  // (petDomain SOT); aqui só injetamos window.location.search. Resultado: string
  // crua (havia param) | null (não havia).
  const [deepLinkKey] = useState(() => (
    typeof window === 'undefined' ? null : parsePetDeepLinkParam(window.location.search)
  ));
  // Vira true quando HAVIA um param mas o pet-alvo não foi achado (sumiu/
  // arquivado/reunido/nunca existiu) → dispara a nota calma pt-BR; o mapa segue
  // 100% usável (degradação calma, sem crash, sem trap de erro).
  const [deepLinkMissing, setDeepLinkMissing] = useState(false);

  // PET-M20 — carga (re-)executável dos pets, EXTRAÍDA do effect para um callback
  // que o botão "Tentar de novo" do estado de erro pode RE-RODAR sem reload de
  // página inteira (acceptance: a retry re-fetcha). Recebe um `isCancelled`
  // opcional (o effect passa o seu guard de unmount; a retry pelo botão não
  // precisa). Liga loading=true / limpa o erro ANTES de buscar, depois desliga
  // loading e, em falha, carimba loadError. O deep link (M18) só é resolvido na
  // 1ª carga (resolveDeepLink), não a cada retry — um retry não deve reabrir a
  // sheet de um link que o usuário pode já ter fechado.
  const loadPets = useCallback(async (isCancelled, { resolveDeepLink = false } = {}) => {
    const cancelled = () => (typeof isCancelled === 'function' ? isCancelled() : false);
    // TODO setState mora APÓS o primeiro `await` (callback assíncrono, nunca o
    // corpo síncrono do effect — evita o react-hooks/set-state-in-effect). O reset
    // loading=true/erro=null é feito pelo CHAMADOR de retry (handler de clique); na
    // 1ª carga o estado inicial já é loading=true/erro=null.
    try {
      const loaded = await fetchPets();
      if (cancelled()) return;
      setPets(loaded);
      // PET-M12 — carimba o relógio real AQUI (callback assíncrono): a exclusão
      // por idade passa a valer assim que os pets chegam. Date.now() fora do
      // render (purity); nowMs é injetado.
      setNowMs(Date.now());
      setLoading(false);

      // PET-M18 — resolve o deep link só na PRIMEIRA carga (resolveDeepLink=true),
      // na lista COMPLETA (`loaded`), não na podada — um link é um pedido EXPLÍCITO
      // do usuário (honrar a intenção, não a poda de UI). Degradação calma quando o
      // pet sumiu/arquivou/reuniu.
      if (resolveDeepLink && deepLinkKey) {
        const target = findPetByCoordsKey(loaded, deepLinkKey);
        if (target) {
          setCenter(target.coords);
          setSelectedPet(target);
          setDetailOpen(true);
        } else {
          setDeepLinkMissing(true);
        }
      }
    } catch (e) {
      if (cancelled()) return;
      // PET-M20 — a falha vira o estado de ERRO (mapLoadState) que mostra a cópia
      // calma + o "Tentar de novo". loading=false para sair do skeleton.
      setLoadError((e && e.message) || 'load_failed');
      setLoading(false);
    }
  }, [deepLinkKey]);

  // PET-M20 — re-fetch do botão "Tentar de novo": religa loading=true / limpa o
  // erro (volta ao skeleton) e re-roda loadPets SEM reload de página inteira
  // (acceptance). Como é um HANDLER DE CLIQUE (não o corpo de um effect), o
  // setState síncrono aqui é sancionado. Sem guard de unmount e sem re-resolver o
  // deep link.
  const handleRetryLoad = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    loadPets();
  }, [loadPets]);

  // GPS + carga inicial dos pets — sincronização com sistemas externos
  // (geolocalização + planilha), o uso sancionado de um effect. setState mora
  // em callbacks/promessas (não no corpo síncrono), guardado por `cancelled`.
  useEffect(() => {
    let cancelled = false;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          setCenter([pos.coords.latitude, pos.coords.longitude]);
          // PET-M8 — só AGORA o centro é "perto de mim" de verdade: a lista pode
          // ordenar por distância. Sem permissão (callback de erro abaixo), o flag
          // fica false e a lista ordena por recência.
          setHasGps(true);
        },
        () => { /* sem permissão de GPS: mantém o centro padrão, hasGps fica false */ },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    }
    // 1ª carga: resolve o deep link (M18) e usa o guard de unmount do effect. O
    // IIFE assíncrono empurra a chamada (e qualquer setState DENTRO de loadPets,
    // que já mora APÓS o await) para fora do corpo SÍNCRONO do effect — o padrão
    // sancionado que evita o react-hooks/set-state-in-effect (mesma técnica do
    // IIFE de carga original).
    (async () => { await loadPets(() => cancelled, { resolveDeepLink: true }); })();
    return () => { cancelled = true; };
    // loadPets é estável (deps = deepLinkKey, que é um inicializador lazy imutável);
    // o effect segue de montagem única.
  }, [loadPets]);

  // PET-M18 — dispensa a nota de "pet não encontrado" (o usuário leu; o mapa segue).
  const handleDismissDeepLinkNote = useCallback(() => setDeepLinkMissing(false), []);

  // Tocar/segurar no mapa só LEMBRA o local (o pin solto confirma visualmente);
  // o sheet abre pelo botão CTA, não a cada toque, para não atrapalhar a navegação.
  const handlePinDropped = useCallback((coords) => { setReportCoords(coords); }, []);

  const handleOpenReport = useCallback(() => {
    setReportCoords((c) => c || center);
    setReportOpen(true);
    // PET-M21 — topo do funil: a sheet de relato abriu. Único ponto de entrada do
    // sheet (setReportOpen(true) só acontece aqui), então o evento dispara uma vez
    // por abertura. Sem PII — só marca a INTENÇÃO de relatar.
    trackReportStarted({});
  }, [center]);

  // PET-M8 — troca a visão (mapa | lista) e PERSISTE a preferência no localStorage
  // (envolto em try/catch: modo privado/quota nunca derruba a troca de visão — a
  // persistência é um conforto, não um requisito). setState no handler de clique
  // (sancionado), nunca no corpo de um effect. Definido AQUI (acima dos handlers de
  // fechamento) para o handleSeeOnMap do PET-M20 reusá-lo diretamente.
  const handleSetView = useCallback((next) => {
    setView(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PET_VIEW_STORAGE_KEY, next);
    } catch (_e) {
      /* persistência indisponível: a troca de visão ainda funciona nesta sessão */
    }
  }, []);

  // PET-M20 — fecha a sheet de relato. Quando o motivo é 'published' (o publish
  // deu certo; PetReportSheet chama onClose('published')), DISPARA o micro-estado
  // de FECHAMENTO (PET_CURVE §4): recentra/realça o pin recém-criado e mostra a
  // confirmação calma. O pin é identificado por resolveClosurePin (reusa o
  // petCoordsKey do M18) na lista atual de pets — onde o publish otimista já
  // adicionou o novo pet. Coords vêm de reportCoords (o local que o relato usou);
  // fallback para o centro, como o sheet faz. Um fechamento NÃO-publicado (cancelar/
  // Escape/backdrop) só fecha o sheet, sem closure.
  const handleCloseReport = useCallback((reason) => {
    setReportOpen(false);
    if (reason !== 'published') return;
    const pin = resolveClosurePin(reportCoords || center, pets);
    if (pin) {
      setCenter(pin.coords);     // recentra no pin recém-criado (confirmação espacial)
      setClosureOpen(true);
    }
  }, [reportCoords, center, pets]);

  // PET-M20 — dispensa o fechamento (botão "Fechar" / Escape). Some e não volta.
  const handleDismissClosure = useCallback(() => setClosureOpen(false), []);

  // PET-M20 — a ÚNICA próxima-decisão do fechamento: "Ver no mapa". Fecha o estado
  // de fechamento (o mapa já está recentrado no pin) e garante a visão MAPA — se o
  // usuário estava na lista, ver-no-mapa significa olhar o pin de fato. Reusa o
  // handleSetView (que persiste a preferência) — uma só verdade de troca de visão.
  const handleSeeOnMap = useCallback(() => {
    setClosureOpen(false);
    handleSetView(PET_VIEW.MAP);
  }, [handleSetView]);

  // PET-M20 — dispensa a dica de 1ª visita: persiste o flag (localStorage) e some
  // para sempre. A persistência é guardada (SSR/quota) dentro de markFirstRunHintSeen.
  const handleDismissHint = useCallback(() => {
    markFirstRunHintSeen();
    setHintOpen(false);
  }, []);

  const handlePetClick = useCallback((pet) => {
    setSelectedPet(pet);
    setDetailOpen(true);
    // PET-M21 — meio do funil (descoberta): uma sheet de detalhe abriu. Só o status
    // do pet aberto (enumerado da SOT) — mede "que tipo de pet as pessoas abrem" sem
    // identificar o pet (nada de coords/contato/nome).
    trackPetOpened({ status: pet && pet.status });
  }, []);
  const handleCloseDetail = useCallback(() => setDetailOpen(false), []);

  // PET-M7b — um pet acabou de ser RESOLVIDO (reunido / encerrar busca) na sheet.
  // Atualiza o pet em `pets` no lugar (casando por coords — a identidade estável
  // do report) com a forma JÁ resolvida que a sheet devolveu (mesmo resolvedAt +
  // closureReason — LSP com o que foi gravado). O `resolved:true` faz o pet sair
  // de `visiblePets` (activePetsByAge não poda resolvidos, mas o marcador do M11
  // os distingue/dimensiona; o mapa reflete o desfecho na hora, sem refetch).
  // Mantém o `selectedPet` em sincronia para a sheet aberta refletir o estado novo.
  const handlePetResolved = useCallback((resolvedPet) => {
    if (!resolvedPet || !Array.isArray(resolvedPet.coords)) return;
    const key = JSON.stringify(resolvedPet.coords);
    setPets((prev) => prev.map((p) => (
      JSON.stringify(p.coords) === key ? { ...p, ...resolvedPet } : p
    )));
    setSelectedPet((prev) => (
      prev && JSON.stringify(prev.coords) === key ? { ...prev, ...resolvedPet } : prev
    ));
    // PET-M21 — fundo do funil: o loop de valor FECHOU. Os dois desfechos do estágio
    // E da curva (PET_CURVE §1-E) são eventos DISTINTOS para medir reunido vs
    // encerrar-busca separadamente. O motivo vem da SOT (closureReason que a sheet
    // gravou via PET-M7b); despachamos por ele. Cada emissor carrega só o status
    // (enumerado) + o motivo fixo da SOT — nunca contato/coords/nome.
    if (resolvedPet.closureReason === PET_CLOSURE_REASON.ENCERRADO) {
      trackEncerrouBusca({ status: resolvedPet.status });
    } else if (resolvedPet.closureReason === PET_CLOSURE_REASON.REUNIDO) {
      trackMarkedReunido({ status: resolvedPet.status });
    }
  }, []);

  // PET-M9b — "possível encontro" (opt-in, NUNCA certo). Os candidatos do pet
  // ABERTO são DERIVADOS por um predicado PURO (findPossibleMatches, petDomain
  // SOT): perdido↔encontrado/avistado dentro de raio/janela, com a EXCLUSÃO de
  // resolvidos/arquivados ANTES de parear e o LIMIAR DE SILÊNCIO já aplicado (a
  // lista só traz pares que ROMPEM o silêncio — pares fracos/coringa ficam de
  // fora aqui mesmo). nowMs é o relógio carimbado pelo effect (injetado, puro).
  //
  // BUSCA na lista COMPLETA `pets`, NÃO em `visiblePets`: o match precisa enxergar
  // candidatos mesmo que um filtro do M7 os esconda do mapa — espelha a decisão do
  // deep-link M18 (honrar a intenção, não a poda de UI). A exclusão por idade do M12
  // continua valendo (faz parte da elegibilidade do §4 dentro de findPossibleMatches),
  // então um candidato arquivado não vaza por usar a lista completa.
  const selectedMatches = useMemo(
    () => (selectedPet ? findPossibleMatches(selectedPet, pets, nowMs) : []),
    [selectedPet, pets, nowMs],
  );

  // Abrir "o outro relato" a partir do hint: recentra e abre o detalhe do candidato
  // (mesma transição do handlePetClick + recentro do deep-link M18). É UMA próxima
  // decisão calma (spec §2.3): comparar as duas listagens. O foco volta a ser
  // gerenciado pela própria PetDetailSheet ao trocar de pet (contrato de modal).
  const handleOpenMatch = useCallback((matchPet) => {
    if (!matchPet) return;
    setSelectedPet(matchPet);
    setCenter(matchPet.coords);
    setDetailOpen(true);
    // PET-M21 — abrir "o outro relato" a partir do hint também ABRE uma sheet de
    // detalhe: mesmo evento de funil que handlePetClick (consistência — o funil de
    // descoberta não tem um buraco por onde o pet foi aberto). Sem PII.
    trackPetOpened({ status: matchPet.status });
  }, []);

  // PET-M7 — toggle imutável de um id numa faceta (a regra pura vive em
  // petDomain; aqui só fazemos o setState). Limpar volta ao filtro vazio.
  const handleToggleFilter = useCallback((facetKey, id) => {
    setFilter((prev) => togglePetFilterValue(prev, facetKey, id));
  }, []);
  const handleClearFilter = useCallback(() => setFilter(defaultPetFilter()), []);

  // Pets VISÍVEIS no mapa ativo = pets → filtro de facetas (PET-M7) → EXCLUSÃO por
  // idade (PET-M12). nowMs do M7 segue 0 (o filtro de status/espécie/porte não
  // consulta o tempo — determinístico). A EXCLUSÃO por idade do M12 usa o `nowMs`
  // carimbado pelo effect (não Date.now() no render — purity), passado ao predicado
  // PURO activePetsByAge. No 1º paint (nowMs=0) nada é arquivado (idade contra a
  // época é negativa → dentro da janela); o effect corrige para o relógio real e
  // poda os arquivados. Os reports além da janela NÃO entram nesta lista (somem do
  // MAPA ativo), mas a linha na planilha fica intacta — nada é mutado/deletado, e
  // uma futura lista/sheet (PET-M8) que mostre arquivados NÃO aplica esta exclusão.
  const visiblePets = useMemo(
    () => activePetsByAge(filterPets(pets, filter, 0), nowMs),
    [pets, filter, nowMs],
  );

  // PET-M20 — estado DERIVADO de carga do mapa (loading | error | empty | ready),
  // computado por mapLoadState (SOT pura). A contagem é a dos pets VISÍVEIS (pós
  // filtro M7 + poda de idade M12): o estado "vazio" compõe com esses filtros sem
  // este módulo conhecê-los — ele só recebe o número. Em ERROR, o loadError manda;
  // em LOADING, o skeleton; em EMPTY, a dica esperançosa; em READY, o mapa/lista.
  const loadState = useMemo(
    () => mapLoadState({ loading, error: loadError, count: visiblePets.length }),
    [loading, loadError, visiblePets.length],
  );
  const isReady = loadState === PET_MAP_LOAD_STATE.READY;

  // Publica um pet, classificando a falha em uma causa CALMA distinta (PET-M1).
  // Remove a antiga string genérica única 'publish_failed' E o caminho de
  // perda-silenciosa em conexão instável: offline/lento vão para a fila
  // IndexedDB (petPublishQueue) e voltam sozinhos no próximo 'online'.
  //
  // Fluxo:
  //   • offline ANTES de tentar  → enfileira direto (não queima a tentativa) e
  //     lança PetPublishError(offline, queued) para o sheet reassegurar.
  //   • sucesso                  → adiciona ao mapa de forma otimista.
  //   • falha                    → classifica; se deve enfileirar, enfileira e
  //     lança com queued:true; senão lança a causa (out_of_bounds/generic).
  // A causa REAL vai para analytics.trackError (redação de token embutida);
  // NUNCA logamos contato/texto-livre (passamos só o reasonCode + a mensagem do
  // erro, que é técnica — coords/contato não entram no payload de erro).
  const handlePublish = useCallback(async (payload) => {
    if (isOfflineNow()) {
      await enqueuePetPublish(payload);
      const reasonCode = PET_PUBLISH_FAILURE.OFFLINE;
      trackError('pet_publish', new Error('offline_at_publish'), { reason: reasonCode, queued: true });
      // PET-M21 — evento de FUNIL de falha (distinto do trackError técnico acima): o
      // funil mede a CLASSE da falha + se foi enfileirada (a confiabilidade que o
      // PET-M1 comprou), sem contato/coords/texto. `status`/`species` vêm enumerados
      // do payload (ids de SET, não texto livre); o resto do payload é ignorado.
      trackReportFailed({ reasonCode, queued: true });
      throw new PetPublishError(reasonCode, true);
    }
    try {
      const pet = await publishPet(payload);
      setPets((prev) => [...prev, pet]);
      // PET-M21 — sucesso (loop de valor avança). Só status + espécie enumerados.
      trackReportPublished({ status: payload && payload.status, species: payload && payload.species });
    } catch (err) {
      const reasonCode = classifyPublishFailure(err, { isOffline: isOfflineNow() });
      const queued = shouldQueuePublishFailure(reasonCode);
      if (queued) {
        // offline/server_slow: guarda o relato — o input do dono não se perde.
        await enqueuePetPublish(payload);
      }
      // Loga a causa real (mensagem técnica, redação de token via trackError);
      // sem contato/texto-livre no payload.
      trackError('pet_publish', err, { reason: reasonCode, queued });
      // PET-M21 — evento de FUNIL de falha com o reasonCode DIFERENCIADO do PET-M1.
      trackReportFailed({ reasonCode, queued });
      throw new PetPublishError(reasonCode, queued, err);
    }
  }, []);

  // PET-M1 — liga o flush da fila offline ao evento 'online'. Um relato
  // enfileirado (offline/lento) é reenviado por publishPet; a chave de
  // idempotência impede o duplo-append. Adiciona ao mapa o que drenou com
  // sucesso. Desliga no unmount.
  useEffect(() => {
    const unbind = bindPetOnlineFlush(
      async (payload) => {
        const pet = await publishPet(payload);
        setPets((prev) => [...prev, pet]);
      },
    );
    return unbind;
  }, []);

  return (
    <>
      {/* Same shared brand header as the hunger map: carries the "Doar" (Pix)
          donate button + PWA install. No onStartReport/onStartTour passed, so the
          hunger-only Relatar / Como-funciona actions stay off; /pets keeps its
          own "Relatar um pet" CTA below. */}
      <Header />
      <main className="mdf-pets">
        <Link href="/" className="mdf-pets__back">← Mapa</Link>
      <header className="mdf-pets__header">
        <h1 className="mdf-pets__title">MapaPets seu pet perdido é encontrado por pessoas do bem</h1>
        <p className="mdf-pets__lead">
          Toque no mapa onde o pet foi visto e toque em <b>Relatar um pet</b>.
          Juntos a gente reúne mais bichinhos com suas famílias.{' '}
          <span aria-hidden="true">🐾</span>
        </p>
        
      </header>

      {/* PET-M20 — dica de PRIMEIRA visita (uma vez, dispensável). Ensina o fluxo
          tocar-no-mapa → Relatar (estágio A da curva, acolhimento). role=status. */}
      <PetFirstRunHint open={hintOpen} onDismiss={handleDismissHint} />

      {/* PET-M18 — degradação CALMA do deep link: o link chegou, mas o pet-alvo
          não está mais no mapa (já foi reunido, arquivado por idade, ou o relato
          não existe mais). Tom sereno, sem alarme — informa sem assustar e deixa o
          mapa totalmente usável. role=status (não alert): é uma informação calma,
          não um erro. Dispensável num toque. */}
      {deepLinkMissing && (
        <p className="mdf-pets__status mdf-pets__status--calm" role="status">
          Esse pet não está mais no mapa — pode já ter sido reencontrado. Veja os
          outros pets por aqui, ou relate um novo.{' '}
          <button
            type="button"
            className="mdf-pets__status-dismiss"
            onClick={handleDismissDeepLinkNote}
          >
            Entendi
          </button>
        </p>
      )}

      {/* PET-M7 — filtro do mapa. A contagem é DERIVADA (visiblePets.length /
          pets.length): a barra não conhece os pets, só recebe os números e os
          toggles. Só aparece quando há pets para filtrar (estado READY) — filtrar
          um mapa em carregamento/erro/vazio não tem sentido e só adicionaria ruído
          de UI a um público em estresse. */}
      {isReady && (
        <PetFilterBar
          filter={filter}
          total={pets.length}
          matchCount={visiblePets.length}
          onToggle={handleToggleFilter}
          onClear={handleClearFilter}
        />
      )}

      {/* PET-M20 — os três estados EXPLÍCITOS de carga do mapa (loading | erro |
          vazio). Renderizado SÓ quando NÃO está pronto; em READY mostra o mapa/lista
          abaixo. O estado de erro carrega o "Tentar de novo" que re-roda o fetch sem
          reload (handleRetryLoad). Distintos por design: skeleton aria-busy ≠ vazio
          ≠ alerta (acceptance 1). */}
      {!isReady && (
        <PetMapLoadStates state={loadState} onRetry={handleRetryLoad} />
      )}

      {isReady && (
        <>
          {/* PET-M8 — alternância MAPA | LISTA. role=tablist semântico: os dois
              botões são tabs (aria-selected reflete a visão ativa), operáveis por
              teclado, alvo >=44px. A preferência persiste (handleSetView →
              localStorage). Ambas as visões consomem o MESMO visiblePets (filtrado
              pelo M7 + podado por idade pelo M12) — a lista reflete o mapa. */}
          <div className="pet-viewtoggle" role="tablist" aria-label="Como ver os pets">
            <button
              type="button"
              role="tab"
              id="pet-viewtoggle-map"
              aria-selected={view === PET_VIEW.MAP}
              className={`pet-viewtoggle__btn${view === PET_VIEW.MAP ? ' pet-viewtoggle__btn--on' : ''}`}
              onClick={() => handleSetView(PET_VIEW.MAP)}
            >
              <span aria-hidden="true">🗺️</span> Mapa
            </button>
            <button
              type="button"
              role="tab"
              id="pet-viewtoggle-list"
              aria-selected={view === PET_VIEW.LIST}
              className={`pet-viewtoggle__btn${view === PET_VIEW.LIST ? ' pet-viewtoggle__btn--on' : ''}`}
              onClick={() => handleSetView(PET_VIEW.LIST)}
            >
              <span aria-hidden="true">📋</span> Lista
            </button>
          </div>

          {view === PET_VIEW.LIST ? (
            <div role="tabpanel" aria-labelledby="pet-viewtoggle-list">
              <PetListView
                pets={visiblePets}
                center={hasGps ? center : null}
                nowMs={nowMs}
                onPetClick={handlePetClick}
              />
            </div>
          ) : (
            <div role="tabpanel" aria-labelledby="pet-viewtoggle-map">
              <PetMap
                center={center}
                pets={visiblePets}
                onPinDropped={handlePinDropped}
                onPetClick={handlePetClick}
              />
            </div>
          )}
        </>
      )}

      <button
        type="button"
        className="mdf-pets__report-btn"
        onClick={handleOpenReport}
      >
        <span aria-hidden="true">🐾</span> Relatar um pet
      </button>

      <PetReportSheet
        open={reportOpen}
        coords={reportCoords || center}
        onClose={handleCloseReport}
        onPublish={handlePublish}
      />
      <PetDetailSheet
        open={detailOpen}
        pet={selectedPet}
        matches={selectedMatches}
        onOpenMatch={handleOpenMatch}
        onResolved={handlePetResolved}
        onClose={handleCloseDetail}
      />

      {/* PET-M20 — micro-estado de FECHAMENTO pós-publicação (PET_CURVE §4). Abre
          após um publish bem-sucedido; o mapa já foi recentrado no pin recém-criado
          (handleCloseReport). Confirmação calma + UMA próxima decisão ("Ver no
          mapa"). Reasseguramento, NÃO nag/streak/timer. role=status (anunciado). */}
      <PetPublishClosure
        open={closureOpen}
        onSeeOnMap={handleSeeOnMap}
        onDismiss={handleDismissClosure}
      />
      </main>
    </>
  );
}
