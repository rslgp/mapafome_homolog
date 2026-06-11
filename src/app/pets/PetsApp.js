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

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import './petPalette.css';
import './pets.css';
import Header from '../components/compatibility/components/header';
import PetMap from './PetMap';
import PetReportSheet from './PetReportSheet';
import PetDetailSheet from './PetDetailSheet';
import { fetchPets, publishPet } from './petsData';

// Mesmo centro padrão do mapa de fome (Recife) até o GPS responder.
const DEFAULT_CENTER = [-8.0671132, -34.8766719];

export default function PetsApp() {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [pets, setPets] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCoords, setReportCoords] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [loadError, setLoadError] = useState(null);

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
        if (!cancelled) setPets(loaded);
      } catch (e) {
        if (!cancelled) setLoadError(e && e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  // Lança em falha de propósito: o PetReportSheet captura e mostra "Tentar de
  // novo" (mesmo contrato do ReportSheet de fome).
  const handlePublish = useCallback(async (payload) => {
    const pet = await publishPet(payload);
    setPets((prev) => [...prev, pet]);
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

      <PetMap
        center={center}
        pets={pets}
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
