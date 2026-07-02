'use client';

// PetsApp, composição do /pets (fork enxuto da infra do MAPA FOME).
//
// Junta as peças produzidas pelos especialistas:
//   • PetMap       , mapa Leaflet enxuto + camada de marcadores de pet
//   • PetReportSheet, bottom-sheet de "Reportar um pet" (status único + campos)
//   • PetDetailSheet, bottom-sheet de detalhe de um pet
//   • petsData      , busca/publica na MESMA planilha, discriminada por kind:'pet'
//
// Fluxo: tocar no mapa "lembra" o local (handlePinDropped grava reportCoords e
// solta o pin); o botão "Relatar um pet" abre o sheet ancorado nesse local
// (ou no GPS / centro padrão). Publicar adiciona o pet ao estado de forma
// otimista para o marcador aparecer na hora.
//
// M10a, o CÉREBRO (estado + handlers + effects + derivações) foi extraído para
// o hook usePetsApp (src/app/pets/usePetsApp.js) por SRP: este arquivo voltou a
// ser um componente FINO que só chama o hook e renderiza o JSX. A extração
// PRESERVA COMPORTAMENTO (mesmo estado, mesmos handlers, mesma saída de render);
// a lógica agora é testável isoladamente (test/petsApp.dom.test.js pina o
// comportamento observável antes e depois da decomposição).

import React from 'react';
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
import { PET_MAP_LOAD_STATE, PET_VIEW } from './petMapLoadState';
import { t } from '../components/compatibility/components/ux/strings';
import usePetsApp from './usePetsApp';

export default function PetsApp() {
  const {
    center,
    hasGps,
    view,
    reportOpen,
    reportCoords,
    detailOpen,
    selectedPet,
    hintOpen,
    filter,
    filterOpen,
    nowMs,
    deepLinkMissing,
    closureOpen,
    pets,
    visiblePets,
    selectedMatches,
    loadState,
    isReady,
    showMap,
    handleRetryLoad,
    handleDismissDeepLinkNote,
    handlePinDropped,
    handleOpenReport,
    handleSetView,
    handleCloseReport,
    handleDismissClosure,
    handleSeeOnMap,
    handleDismissHint,
    handlePetClick,
    handleCloseDetail,
    handlePetResolved,
    handleOpenMatch,
    handleToggleFilter,
    handleSetRecency,
    handleClearFilter,
    handleToggleFilterOpen,
    handlePublish,
  } = usePetsApp();

  return (
    <>
      {/* Same shared brand header as the hunger map: carries the "Doar" (Pix)
          donate button + PWA install. No onStartReport/onStartTour passed, so the
          hunger-only Relatar / Como-funciona actions stay off; /pets keeps its
          own "Relatar um pet" CTA below. */}
      <Header />
      <main className="mdf-pets">
        <Link href="/" className="mdf-pets__back">{t('pets.back')}</Link>
      <header className="mdf-pets__header">
        <h1 className="mdf-pets__title">{t('pets.header.title')}</h1>
        <p className="mdf-pets__lead">
          {t('pets.header.lead.pre')} <b>{t('pets.header.lead.cta')}</b>{t('pets.header.lead.post')}{' '}
          <span aria-hidden="true">🐾</span>
        </p>

      </header>

      {/* PET-M20, dica de PRIMEIRA visita (uma vez, dispensável). Ensina o fluxo
          tocar-no-mapa → Relatar (estágio A da curva, acolhimento). role=status. */}
      <PetFirstRunHint open={hintOpen} onDismiss={handleDismissHint} />

      {/* PET-M18, degradação CALMA do deep link: o link chegou, mas o pet-alvo
          não está mais no mapa (já foi reunido, arquivado por idade, ou o relato
          não existe mais). Tom sereno, sem alarme, informa sem assustar e deixa o
          mapa totalmente usável. role=status (não alert): é uma informação calma,
          não um erro. Dispensável num toque. */}
      {deepLinkMissing && (
        <p className="mdf-pets__status mdf-pets__status--calm" role="status">
          {t('pets.deeplink.missing')}{' '}
          <button
            type="button"
            className="mdf-pets__status-dismiss"
            onClick={handleDismissDeepLinkNote}
          >
            {t('pets.deeplink.dismiss')}
          </button>
        </p>
      )}

      {/* PET-M7, filtro do mapa. A contagem é DERIVADA (visiblePets.length /
          pets.length): a barra não conhece os pets, só recebe os números e os
          toggles. Aparece sempre que o MAPA aparece (READY ou EMPTY), gateada em
          `showMap`, NÃO em `isReady`. PET-M20 passou a mostrar o mapa em EMPTY (0
          pets, o estado de produção hoje) para o dono soltar um pin e relatar;
          a barra de filtro precisa ACOMPANHAR o mapa, senão um dono que procura o
          próprio pet vê o mapa mas NENHUM chip de filtro (status/espécie/cor/porte/
          recência). Só LOADING (skeleton) e ERROR (retry), onde não há mapa nem
          dados, a escondem. */}
      {showMap && (
        <PetFilterBar
          filter={filter}
          total={pets.length}
          matchCount={visiblePets.length}
          expanded={filterOpen}
          onToggleOpen={handleToggleFilterOpen}
          onToggle={handleToggleFilter}
          onSetRecency={handleSetRecency}
          onClear={handleClearFilter}
        />
      )}

      {/* PET-M20, estados EXPLÍCITOS de carga. LOADING (skeleton) e ERROR
          (retry) substituem o mapa: não há dados a mostrar ainda. EMPTY NÃO
          substitui, ele acompanha o mapa (a dica "seja o primeiro" por cima),
          porque o visitante precisa do mapa para soltar um pin e relatar o
          primeiro pet. O erro carrega "Tentar de novo" (handleRetryLoad, sem
          reload). Distintos por design: skeleton aria-busy ≠ vazio ≠ alerta. */}
      {!showMap && (
        <PetMapLoadStates state={loadState} onRetry={handleRetryLoad} />
      )}

      {showMap && (
        <>
          {/* PET-M8, alternância MAPA | LISTA. role=tablist semântico: os dois
              botões são tabs (aria-selected reflete a visão ativa), operáveis por
              teclado, alvo >=44px. A preferência persiste (handleSetView →
              localStorage). Ambas as visões consomem o MESMO visiblePets (filtrado
              pelo M7 + podado por idade pelo M12), a lista reflete o mapa. Só
              aparece em READY: alternar para uma lista vazia não faz sentido. */}
          {isReady && (
          <div className="pet-viewtoggle" role="tablist" aria-label={t('pets.view.aria')}>
            <button
              type="button"
              role="tab"
              id="pet-viewtoggle-map"
              aria-selected={view === PET_VIEW.MAP}
              className={`pet-viewtoggle__btn${view === PET_VIEW.MAP ? ' pet-viewtoggle__btn--on' : ''}`}
              onClick={() => handleSetView(PET_VIEW.MAP)}
            >
              <span aria-hidden="true">🗺️</span> {t('pets.view.map')}
            </button>
            <button
              type="button"
              role="tab"
              id="pet-viewtoggle-list"
              aria-selected={view === PET_VIEW.LIST}
              className={`pet-viewtoggle__btn${view === PET_VIEW.LIST ? ' pet-viewtoggle__btn--on' : ''}`}
              onClick={() => handleSetView(PET_VIEW.LIST)}
            >
              <span aria-hidden="true">📋</span> {t('pets.view.list')}
            </button>
          </div>
          )}

          {isReady && view === PET_VIEW.LIST ? (
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
              {/* PET-M20, em EMPTY o mapa continua aqui (para soltar um pin e
                  relatar o 1º pet) com a dica esperançosa por cima; em READY é o
                  mapa normal. */}
              {loadState === PET_MAP_LOAD_STATE.EMPTY && (
                <PetMapLoadStates state={loadState} onRetry={handleRetryLoad} />
              )}
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
        <span aria-hidden="true">🐾</span> {t('pets.report.fab')}
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

      {/* PET-M20, micro-estado de FECHAMENTO pós-publicação (PET_CURVE §4). Abre
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
