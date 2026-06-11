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
import PetReportSheet from './PetReportSheet';
import PetDetailSheet from './PetDetailSheet';
import { fetchPets, publishPet } from './petsData';
import {
  classifyPublishFailure,
  shouldQueuePublishFailure,
  PET_PUBLISH_FAILURE,
  defaultPetFilter,
  filterPets,
  togglePetFilterValue,
  activePetsByAge,
  parsePetDeepLinkParam,
  findPetByCoordsKey,
} from './petDomain';
import {
  enqueue as enqueuePetPublish,
  bindOnlineFlush as bindPetOnlineFlush,
} from './petPublishQueue';
import { trackError } from '../components/compatibility/components/ux/analytics';

// Mesmo centro padrão do mapa de fome (Recife) até o GPS responder.
const DEFAULT_CENTER = [-8.0671132, -34.8766719];

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
  const [pets, setPets] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCoords, setReportCoords] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [loadError, setLoadError] = useState(null);
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

  // GPS + carga inicial dos pets — sincronização com sistemas externos
  // (geolocalização + planilha), o uso sancionado de um effect. setState mora
  // em callbacks/promessas (não no corpo síncrono), guardado por `cancelled`.
  useEffect(() => {
    let cancelled = false;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { if (!cancelled) setCenter([pos.coords.latitude, pos.coords.longitude]); },
        () => { /* sem permissão de GPS: mantém o centro padrão */ },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    }
    (async () => {
      try {
        const loaded = await fetchPets();
        if (!cancelled) {
          setPets(loaded);
          // PET-M12 — carimba o relógio real AQUI (callback assíncrono, não o corpo
          // síncrono do effect): a exclusão por idade passa a valer assim que os
          // pets chegam. Date.now() fica fora do render (purity); nowMs é injetado.
          setNowMs(Date.now());

          // PET-M18 — resolve o deep link AQUI, no MESMO callback assíncrono onde os
          // pets acabaram de chegar (setState sancionado: callback/promessa, nunca o
          // corpo síncrono do effect — espelha o setPets/setNowMs acima e evita o
          // react-hooks/set-state-in-effect). Roda uma vez só (este bloco roda uma
          // vez por carga inicial).
          //
          // BUSCA NA LISTA COMPLETA (`loaded`), NÃO na filtrada/podada por idade: um
          // link compartilhado é um pedido EXPLÍCITO do usuário para ver AQUELE pet.
          // Honrá-lo mesmo que um filtro do M7 ou a janela de idade do M12 o
          // esconderia do mapa por padrão é o comportamento menos surpreendente — o
          // usuário clicou no link de propósito. A sheet do pet-alvo abre mesmo que o
          // pin esteja filtrado/arquivado no mapa.
          //
          // DEGRADAÇÃO CALMA: param presente mas nenhum pet casa (sumiu/arquivado/
          // reunido/nunca existiu) → deepLinkMissing → nota pt-BR serena; o mapa
          // segue usável. Sem param (null) → nada acontece, o mapa abre normal.
          if (deepLinkKey) {
            const target = findPetByCoordsKey(loaded, deepLinkKey);
            if (target) {
              // Recentra no pet E abre o detalhe — o link "aterrissa" no pet, fechando
              // o beco-sem-saída que esta milestone REMOVE (um link compartilhado que
              // não conseguia focar o seu pet).
              setCenter(target.coords);
              setSelectedPet(target);
              setDetailOpen(true);
            } else {
              setDeepLinkMissing(true);
            }
          }
        }
      } catch (e) {
        if (!cancelled) setLoadError(e && e.message);
      }
    })();
    return () => { cancelled = true; };
    // deepLinkKey é estável (inicializador lazy, nunca muda) — o effect segue de
    // montagem única; listá-lo documenta a dependência sem re-disparar.
  }, [deepLinkKey]);

  // PET-M18 — dispensa a nota de "pet não encontrado" (o usuário leu; o mapa segue).
  const handleDismissDeepLinkNote = useCallback(() => setDeepLinkMissing(false), []);

  // Tocar/segurar no mapa só LEMBRA o local (o pin solto confirma visualmente);
  // o sheet abre pelo botão CTA, não a cada toque, para não atrapalhar a navegação.
  const handlePinDropped = useCallback((coords) => { setReportCoords(coords); }, []);

  const handleOpenReport = useCallback(() => {
    setReportCoords((c) => c || center);
    setReportOpen(true);
  }, [center]);

  const handleCloseReport = useCallback(() => setReportOpen(false), []);
  const handlePetClick = useCallback((pet) => { setSelectedPet(pet); setDetailOpen(true); }, []);
  const handleCloseDetail = useCallback(() => setDetailOpen(false), []);

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
      throw new PetPublishError(reasonCode, true);
    }
    try {
      const pet = await publishPet(payload);
      setPets((prev) => [...prev, pet]);
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

      {loadError && (
        <p className="mdf-pets__status" role="alert">
          Não foi possível carregar os pets agora. Você ainda pode reportar um.
        </p>
      )}

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
          toggles. Estreita os pins na hora porque é `visiblePets` que vai ao mapa. */}
      <PetFilterBar
        filter={filter}
        total={pets.length}
        matchCount={visiblePets.length}
        onToggle={handleToggleFilter}
        onClear={handleClearFilter}
      />

      <PetMap
        center={center}
        pets={visiblePets}
        onPinDropped={handlePinDropped}
        onPetClick={handlePetClick}
      />

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
        onClose={handleCloseDetail}
      />
      </main>
    </>
  );
}
