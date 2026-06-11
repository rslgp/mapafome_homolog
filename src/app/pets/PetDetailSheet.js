'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../components/compatibility/components/ux/PinDetailSheet.css';
import './pets.css';
import { createDirectionUrl, formatRelativeTime } from '../components/compatibility/components/mapUtils';
import { resolveContact } from '../components/compatibility/components/ux/contactLink';
import { PET_STATUS_MAP, PET_SPECIES, PET_SIZES, petCoordsKey, PET_DEEPLINK_PARAM, PET_CLOSURE_REASON } from './petDomain';
import { looksLikeDirectImageUrl } from './petPhoto';
import { buildPetShareMessage, sharePet } from './petShare';
import { flagPet, resolvePet } from './petsData';

// PET-M4 — estados do fluxo de denúncia (flag) na própria sheet (máquina de
// estados pequena, dois passos: ocioso → confirmar → enviando → feito/erro).
// IDLE: mostra o link discreto "Denunciar"; CONFIRM: pergunta calma + confirmar/
// cancelar; SENDING: gravando; DONE: agradece e some o controle; ERROR: cópia
// calma de "não deu, tente de novo".
const FLAG_IDLE = 'idle';
const FLAG_CONFIRM = 'confirm';
const FLAG_SENDING = 'sending';
const FLAG_DONE = 'done';
const FLAG_ERROR = 'error';

// PET-M7b — máquina de estados do FECHAMENTO (lifecycle) na própria sheet,
// ESPELHANDO o padrão de dois passos da denúncia acima. Um único state cobre os
// DOIS desfechos (reunido / encerrar busca): o passo de confirmação guarda QUAL
// motivo está pendente, então não duplicamos a máquina. Estágio E da curva
// (PET_CURVE §1-E) — desfecho com confirmação GENTIL e sucesso MORNO, jamais um
// pico celebratório (governador §2, regra do não-spike).
//   IDLE:    mostra os dois botões de ação ("Marcar como reunido" / "Encerrar
//            busca"); CONFIRM_REUNIDO / CONFIRM_ENCERRADO: pergunta calma +
//            confirmar/voltar para o motivo escolhido; SENDING: gravando;
//            DONE_REUNIDO / DONE_ENCERRADO: estado morno-mas-não-spiked específico
//            de cada desfecho; ERROR: cópia calma de "não deu, tente de novo".
const LC_IDLE = 'idle';
const LC_CONFIRM_REUNIDO = 'confirm_reunido';
const LC_CONFIRM_ENCERRADO = 'confirm_encerrado';
const LC_SENDING = 'sending';
const LC_DONE_REUNIDO = 'done_reunido';
const LC_DONE_ENCERRADO = 'done_encerrado';
const LC_ERROR = 'error';

// Mapeia o estado de confirmação → o motivo de fechamento da SOT, para o handler
// gravar o motivo certo sem reimplementar a regra em cada botão (lookup, não
// condicional espalhada). Cada confirmação sabe qual motivo está pendente.
const CONFIRM_TO_REASON = {
  [LC_CONFIRM_REUNIDO]: PET_CLOSURE_REASON.REUNIDO,
  [LC_CONFIRM_ENCERRADO]: PET_CLOSURE_REASON.ENCERRADO,
};

// /pets — read-only detail sheet, forked from PinDetailSheet. Shows the report a
// person published: status badge, species/size/color line, name (or fallback),
// detail text, relative time, a tap-to-act contact link, and "Como chegar".
// No claim/attend actions — a lost pet has no "I'm going now" verb.

const SPECIES_MAP = PET_SPECIES.reduce((map, s) => { map[s.id] = s; return map; }, {});
const SIZE_MAP = PET_SIZES.reduce((map, s) => { map[s.id] = s; return map; }, {});

function describePet(pet) {
  // "Cão · Médio · caramelo" — only the parts we actually have, joined by · .
  const parts = [];
  const sp = SPECIES_MAP[pet.species];
  if (sp) parts.push(sp.label);
  const sz = SIZE_MAP[pet.size];
  if (sz) parts.push(sz.label);
  const color = (pet.color || '').trim();
  if (color) parts.push(color);
  return parts.join(' · ');
}

export default function PetDetailSheet({ open, pet, matches = [], onOpenMatch, onResolved, onClose }) {
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const revealRef = useRef(null);
  // PET-M7b — leva o foco para o estado de fechamento DONE depois da transição,
  // para um usuário de leitor de tela não ficar preso no botão que sumiu (mesma
  // disciplina rAF do revealRef). O nó DONE tem role=status (anúncio AT) + tabIndex.
  const lifecycleDoneRef = useRef(null);

  // PET-M3 — REVEAL-ON-TAP. O contato de quem reportou NÃO é exposto ao abrir o
  // detalhe: um estranho que só passa o olho na listagem não leva o contato de
  // graça (curva §D — momento de maior vulnerabilidade do dono; ver PET_CURVE §5,
  // golpe do falso achador). O href de contato só é RESOLVIDO depois deste tap
  // explícito — antes disso, `resolveContact` nem roda sobre o dado bruto.
  const [revealed, setRevealed] = useState(false);

  // PET-M4 — estado do fluxo de denúncia (dois passos). Reseta junto com o
  // reveal quando o pet aberto muda (mesma forcing-function de não-vazamento).
  const [flagState, setFlagState] = useState(FLAG_IDLE);

  // PET-M7b — estado do fluxo de FECHAMENTO (lifecycle). Reseta ao trocar de pet
  // (mesma forcing-function): um fechamento pendente de um pet jamais "vaza" para
  // o próximo aberto.
  const [lifecycleState, setLifecycleState] = useState(LC_IDLE);

  // PET-M9b — o hint "possível encontro" é DISPENSÁVEL (opt-in, não-intrusivo,
  // spec §2.1/§2.4): o dono pode fechá-lo sem agir. Reseta ao trocar de pet (igual
  // ao reveal/flag) para a dispensa de um detalhe não vazar para o próximo aberto.
  const [matchDismissed, setMatchDismissed] = useState(false);

  // PET-M15 — estado de carga da FOTO (quando a URL é uma imagem direta):
  //   'loading' → mostra o skeleton enquanto o <img> baixa;
  //   'loaded'  → a imagem pintou; esconde o skeleton;
  //   'error'   → a URL quebrou/sumiu (takedown, link morto) → degrada para o
  //               placeholder calmo, NUNCA um <img> quebrado (PET-M14 §4.5).
  // Reseta ao trocar de pet (mesma forcing-function do reveal/flag) — o estado de
  // uma foto não vaza para o próximo pet aberto. Começa em 'loading' a cada novo
  // pet com imagem direta; o onLoad/onError do <img> avança a máquina.
  const [photoLoadState, setPhotoLoadState] = useState('loading');

  // Reseta a revelação quando ABRE ou TROCA de pet, SEM um effect (que dispararia
  // o aviso react-hooks/set-state-in-effect e um render em cascata). Padrão
  // oficial do React "ajustar estado durante o render quando uma prop muda":
  // guardamos a última identidade num ref e, se ela mudou, zeramos a revelação
  // no corpo do render. Garante que a revelação de um pet jamais "vaza" para o
  // próximo aberto (forcing-function contra estado preso entre dois detalhes).
  const petKey = pet ? `${JSON.stringify(pet.coords)}|${pet.dateIso || ''}` : null;
  const lastKeyRef = useRef(null);
  const openKey = open ? petKey : null;
  if (lastKeyRef.current !== openKey) {
    lastKeyRef.current = openKey;
    if (revealed) setRevealed(false);
    // PET-M4 — a denúncia de um pet jamais "vaza" para o próximo aberto.
    if (flagState !== FLAG_IDLE) setFlagState(FLAG_IDLE);
    // PET-M7b — um fechamento pendente de um pet também não vaza para o próximo.
    if (lifecycleState !== LC_IDLE) setLifecycleState(LC_IDLE);
    // PET-M9b — a dispensa do hint também não vaza para o próximo pet aberto.
    if (matchDismissed) setMatchDismissed(false);
    // PET-M15 — a carga da foto reinicia a cada pet (volta a 'loading') para o
    // skeleton aparecer de novo e um erro de uma URL anterior não vazar.
    if (photoLoadState !== 'loading') setPhotoLoadState('loading');
  }

  useEffect(() => {
    if (!open) return undefined;
    triggerRef.current = document.activeElement;
    const id = requestAnimationFrame(() => closeRef.current?.focus());

    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('keydown', onKey);
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
  }, [open, onClose]);

  const derived = useMemo(() => {
    if (!pet) return null;
    const statusMeta = PET_STATUS_MAP[pet.status] || null;
    const coords = Array.isArray(pet.coords) && pet.coords.length === 2 ? pet.coords : null;
    // Há um contato BRUTO no relato? (apenas presença — NÃO resolvemos o href
    // aqui; isso só acontece após o reveal, abaixo.) `hasContact` decide se o
    // botão "Mostrar contato" deve sequer aparecer, sem expor o dado.
    const hasContact = Boolean((pet.contact || '').trim());
    const photos = (pet.photos || '').trim();
    // PET-M15 — a URL é uma IMAGEM DIRETA (renderável como <img>) ou um álbum/pasta
    // (mantém o link "Ver as fotos do pet")? looksLikeDirectImageUrl é conservador:
    // só true para um caminho que termina em extensão de imagem conhecida — um
    // "true" errado viraria um <img> quebrado, exatamente o que o PET-M15 proíbe.
    // O species glyph (da SOT) alimenta o placeholder calmo quando não há imagem.
    const speciesMeta = SPECIES_MAP[pet.species] || null;
    return {
      statusMeta,
      coords,
      dirHref: coords ? createDirectionUrl(coords) : null,
      descline: describePet(pet),
      name: (pet.name || '').trim(),
      detail: (pet.detail || '').trim(),
      photos,
      isDirectImage: looksLikeDirectImageUrl(photos),
      speciesGlyph: speciesMeta ? speciesMeta.icon : '🐾',
      speciesLabel: speciesMeta ? speciesMeta.label : 'pet',
      timeSince: formatRelativeTime(pet.dateIso),
      hasContact,
    };
  }, [pet]);

  // O href só é construído DEPOIS do tap (revealed) — a barricada de PII é
  // temporal, não só visual: enquanto não revelado, o contato bruto nunca vira
  // um link clicável no DOM. Memoizado por pet+revealed para não re-resolver a
  // cada render.
  const revealedContact = useMemo(() => {
    if (!pet || !revealed) return null;
    return resolveContact(pet.contact);
  }, [pet, revealed]);

  // PET-M9b — "possível encontro" (opt-in, calmo, NUNCA certo). `matches` já vem
  // do predicado PURO (findPossibleMatches) com o LIMIAR DE SILÊNCIO aplicado:
  // pares fracos/coringa NUNCA chegam aqui (spec §3). Mostramos só o MELHOR
  // candidato (matches[0], já ordenado) → UMA próxima decisão calma: ver o outro
  // relato (spec §2.3). NENHUM score/porcentagem é exposto (banido §2.2); o tom é
  // "pode ser", não "encontramos" (§2.2). O link ao candidato usa a identidade
  // M18 (petCoordsKey) — a mesma SOT do deep-link, então abrir o outro relato é a
  // ação de focar AQUELE pet. Espelhamento dono/achador (§1.1): se o pet ABERTO é
  // o `perdido`, o dono vê "alguém pode ter visto seu pet"; se é um achado, o autor
  // vê "este pet pode ter dono procurando".
  const matchHint = useMemo(() => {
    if (!pet || !Array.isArray(matches) || matches.length === 0) return null;
    const best = matches[0];
    if (!best || !best.pet) return null;
    const targetKey = petCoordsKey(best.pet.coords);
    if (!targetKey) return null; // sem identidade estável → não oferece o link (degrada calmo)
    // Registro de tom espelhado (a copy LITERAL final é de uiux/PET-M23; aqui fixa-se
    // o registro "possível", calmo, sem certeza — spec §2.2/§2.4).
    const openIsLost = pet.status === 'perdido';
    const lead = openIsLost
      ? 'Pode ser que alguém tenha visto um pet parecido por perto.'
      : 'Pode ser que este pet tenha alguém procurando por ele por perto.';
    return { targetPet: best.pet, targetKey, lead, count: matches.length };
  }, [pet, matches]);

  // Após revelar, leva o foco para o contato revelado (leitor de tela e teclado
  // não ficam presos no botão que acabou de sumir). rAF: espera o DOM pintar o
  // novo nó antes de focar.
  useEffect(() => {
    if (!revealed) return undefined;
    const id = requestAnimationFrame(() => revealRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [revealed]);

  // PET-M4 — confirma e grava a denúncia. Persiste o flag no blob Dados via o
  // writer coords-keyed do PET-M2 (flagPet → updatePetByCoords → incrementPetFlag),
  // que reescreve SÓ a coluna Dados e só casa uma linha de pet (isolamento). A
  // idempotency_key é DERIVADA das coords do pet, então um re-tap ou reabrir a
  // mesma sheet não conta a denúncia duas vezes (reusa o cache de petsData).
  // Async é aceitável aqui: NÃO é uma chamada de gesto sensível (share/clipboard);
  // é uma escrita comum, então o await depois do clique não é descartado pelo
  // browser. Degrada com calma para ERROR se a gravação falhar.
  const handleFlag = async () => {
    if (!pet) return;
    setFlagState(FLAG_SENDING);
    try {
      const key = `flag:${JSON.stringify(pet.coords)}`;
      await flagPet({ coords: pet.coords, idempotency_key: key });
      setFlagState(FLAG_DONE);
    } catch (_e) {
      // Sem detalhe técnico na UI (e sem PII): só uma cópia calma de "não deu".
      setFlagState(FLAG_ERROR);
    }
  };

  // PET-M7b — confirma e grava o FECHAMENTO (reunido / encerrar busca). Espelha
  // handleFlag: persiste pelo writer coords-keyed do PET-M2 (resolvePet →
  // updatePetByCoords), que reescreve SÓ a coluna Dados (resolvedAt + closureReason)
  // e só casa uma linha de pet (isolamento). A idempotency_key é DERIVADA das coords
  // do pet, então um re-tap não regrava (reusa o cache de petsData). Async é
  // aceitável (não é um gesto sensível de share/clipboard — é uma escrita comum).
  // Em sucesso, AVISA o PetsApp (onResolved) para atualizar o pet no estado: o
  // marcador reunido do M11 renderiza e o pet sai do mapa ativo na hora. Degrada
  // com calma para ERROR se a gravação falhar — sem culpa, sem alarme.
  const handleResolve = async (reason) => {
    if (!pet) return;
    setLifecycleState(LC_SENDING);
    // Carimba o ISO AQUI (uma vez) e passa ao writer E ao onResolved, para o pet
    // otimista no estado bater com o que foi gravado (mesmo resolvedAt — LSP).
    const resolvedAt = new Date().toISOString();
    try {
      const key = `resolve:${reason}:${JSON.stringify(pet.coords)}`;
      await resolvePet({ coords: pet.coords, resolvedAt, closureReason: reason, idempotency_key: key });
      onResolved?.({ ...pet, resolvedAt, resolved: true, closureReason: reason });
      setLifecycleState(reason === PET_CLOSURE_REASON.REUNIDO ? LC_DONE_REUNIDO : LC_DONE_ENCERRADO);
    } catch (_e) {
      setLifecycleState(LC_ERROR);
    }
  };

  // PET-M19 — COMPARTILHAR (WhatsApp / native share). Handler de GESTO: tudo aqui
  // é SÍNCRONO. A mensagem + o deep-link M18 são montados pela fn PURA
  // (buildPetShareMessage) e sharePet dispara navigator.share / abre wa.me NO MESMO
  // TICK do clique — SEM await antes, ou o browser mobile descarta o gesto (perde a
  // user-activation, contrato de gesto do agente). Nenhuma escrita/IO precede a
  // chamada de share, então não há nada para awaitar: o payload já está em mãos.
  // SEM PII na mensagem (status + espécie + área + link; o contato é revelado só no
  // tap do M3 no destino). Defensivo: sem pet → no-op.
  const handleShare = () => {
    if (!pet) return;
    const payload = buildPetShareMessage(pet);
    sharePet(payload);
  };

  // Após a transição para um estado DONE, leva o foco para a mensagem de
  // fechamento (role=status já anuncia ao AT; o foco evita o leitor de tela/
  // teclado ficar preso no botão que sumiu). rAF: espera o DOM pintar o novo nó.
  // Mesma disciplina do effect de revelar contato (PET-M3).
  const lifecycleDone = lifecycleState === LC_DONE_REUNIDO || lifecycleState === LC_DONE_ENCERRADO;
  useEffect(() => {
    if (!lifecycleDone) return undefined;
    const id = requestAnimationFrame(() => lifecycleDoneRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [lifecycleDone]);

  if (!open || !pet || !derived) return null;

  const { statusMeta } = derived;
  const statusClass = statusMeta ? `pet-detail__status--${statusMeta.id}` : '';
  const statusLabel = statusMeta ? statusMeta.label : 'Pet';
  const displayName = derived.name || 'Pet sem nome';

  return (
    <div
      className="mdf-pin-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pet-detail-title"
    >
      <div className="mdf-pin-sheet__backdrop" aria-hidden="true" onClick={() => onClose?.()} />
      <div className="mdf-pin-sheet__panel">
        <div className="mdf-pin-sheet__handle" aria-hidden="true" />

        <div className={`mdf-pin-sheet__status pet-detail__status ${statusClass}`}>
          {statusMeta && (
            <span className="pet-detail__status-icon" aria-hidden="true">{statusMeta.icon}</span>
          )}
          {statusLabel}
        </div>

        <h2 id="pet-detail-title" className="mdf-pin-sheet__title">
          {displayName}
        </h2>

        {derived.descline && (
          <p className="pet-detail__descline">{derived.descline}</p>
        )}

        {/* PET-M15 — exibição da FOTO (o que mais ajuda a reconhecer). Três casos,
            decididos pela forma da URL (já passada por sanitizePhotosUrl no parse):
              1. IMAGEM DIRETA (looksLikeDirectImageUrl) → renderiza um <img> de
                 verdade com alt acessível + estado de carga (skeleton). Se a URL
                 quebrar/sumir (takedown, link morto), o onError degrada para o
                 placeholder calmo — NUNCA um <img> quebrado (PET-M14 §4.5).
              2. ÁLBUM/PASTA (URL não-direta, ex.: pasta do Drive) → mantém o link
                 "Ver as fotos do pet" (um <img> ali seria quebrado).
              3. SEM FOTO → um placeholder discreto com o glifo da espécie (o
                 tratamento de COR/skeleton final é do PET-M16; aqui é a base
                 funcional, nunca um ícone de imagem quebrada).
            O placeholder/skeleton visual fino é escopo do PET-M16 — aqui entregamos
            o COMPORTAMENTO (os três estados existem e degradam com elegância). */}
        {derived.isDirectImage && photoLoadState !== 'error' ? (
          <div className="pet-detail__photo">
            {photoLoadState === 'loading' && (
              <div
                className="pet-detail__photo-skeleton"
                aria-hidden="true"
                data-testid="pet-photo-skeleton"
              />
            )}
            {/* foto remota de host externo (PET-M14); next/image exigiria config
                de domínio e esta rota é ssr:false — um <img> nativo é o correto. */}
            <img
              className={`pet-detail__photo-img${photoLoadState === 'loaded' ? ' pet-detail__photo-img--ready' : ''}`}
              src={derived.photos}
              alt={`Foto do pet (${derived.speciesLabel}${derived.name ? `, ${derived.name}` : ''})`}
              loading="lazy"
              onLoad={() => setPhotoLoadState('loaded')}
              onError={() => setPhotoLoadState('error')}
            />
          </div>
        ) : derived.photos && !derived.isDirectImage ? (
          <a
            className="pet-detail__album"
            href={derived.photos}
            target="_blank"
            rel="noreferrer"
          >
            <span className="pet-detail__album-icon" aria-hidden="true">📷</span>
            <span className="pet-detail__album-text">
              <span className="pet-detail__album-title">Ver as fotos do pet</span>
              <span className="pet-detail__album-sub">o que mais ajuda a reconhecer</span>
            </span>
          </a>
        ) : (
          /* SEM foto (ou imagem direta que falhou ao carregar): placeholder calmo
             com o glifo da espécie. NUNCA um <img> quebrado. role/alt textual para
             o leitor de tela entender que não há foto, sem soar como erro. */
          <div className="pet-detail__photo-placeholder" role="img" aria-label="Este relato está sem foto">
            <span className="pet-detail__photo-placeholder-glyph" aria-hidden="true">
              {derived.speciesGlyph}
            </span>
            <span className="pet-detail__photo-placeholder-text">Sem foto neste relato</span>
          </div>
        )}

        <dl className="mdf-pin-sheet__meta">
          {derived.timeSince && (
            <>
              <dt>Reportado</dt>
              <dd>{derived.timeSince}</dd>
            </>
          )}
        </dl>

        {derived.detail && <p className="mdf-pin-sheet__detail">{derived.detail}</p>}

        {/* PET-M9b — hint "possível encontro": OPT-IN, calmo, NUNCA certo. Aparece
            só quando há um candidato que ROMPEU O SILÊNCIO (spec §3, já filtrado no
            predicado). Tom "pode ser" (§2.2), sem score/porcentagem (§2.2), UMA
            próxima decisão calma — ver o outro relato (§2.3) — e DISPENSÁVEL (§2.1).
            role=note (informação serena), aria-live=off (não interrompe o AT: o dono
            decide olhar). O link foca o candidato via a identidade M18 (petCoordsKey),
            sem prometer "verificado" (§5 — o match aproxima, não prova). */}
        {matchHint && !matchDismissed && (
          <div className="pet-detail__match" role="note" aria-label="Possível encontro">
            <p className="pet-detail__match-lead">
              <span className="pet-detail__match-icon" aria-hidden="true">💛</span>
              {matchHint.lead} Vale olhar com calma — pode não ser, e tudo bem.
            </p>
            <div className="pet-detail__match-actions">
              <button
                type="button"
                className="pet-detail__match-open"
                data-deeplink-param={PET_DEEPLINK_PARAM}
                data-match-key={matchHint.targetKey}
                onClick={() => onOpenMatch?.(matchHint.targetPet)}
              >
                Ver o outro relato
              </button>
              <button
                type="button"
                className="pet-detail__match-dismiss"
                onClick={() => setMatchDismissed(true)}
              >
                Agora não
              </button>
            </div>
          </div>
        )}

        {/* PET-M3 — contato sob reveal-on-tap. Enquanto NÃO revelado, mostramos
            só um botão calmo + a nota de privacidade /pets-específica. O dado de
            contato não está no DOM como link clicável até o tap. */}
        {derived.hasContact && !revealed && (
          <div className="pet-detail__contact-gate">
            <button
              type="button"
              className="pet-detail__reveal-btn"
              onClick={() => setRevealed(true)}
            >
              <span aria-hidden="true">🔒</span>
              <span>Mostrar contato de quem reportou</span>
            </button>
            <p className="pet-detail__privacy-note">
              O contato fica escondido até você tocar — para proteger quem
              reportou. Combine com calma e, se puder, confirme um detalhe que só
              o dono saberia antes de qualquer acerto.
            </p>
          </div>
        )}

        {revealed && revealedContact && revealedContact.href && (
          <a
            ref={revealRef}
            className="mdf-pin-sheet__contact"
            href={revealedContact.href}
            target="_blank"
            rel="noreferrer"
          >
            <span aria-hidden="true">{revealedContact.icon}</span>
            <span>{revealedContact.label} de quem reportou</span>
          </a>
        )}

        {revealed && revealedContact && !revealedContact.href && (
          <p ref={revealRef} tabIndex={-1} className="mdf-pin-sheet__stub">
            {revealedContact.label}
          </p>
        )}

        {/* PET-M7b — ações de FECHAMENTO (estágio E da curva, PET_CURVE §1-E): as
            PRIMEIRAS ações de escrita da sheet. "Marcar como reunido" (o desfecho
            mais esperançoso) e "Encerrar busca" (um fechamento DIGNO e consciente,
            sem culpa). Cada uma é um fluxo de DOIS passos gentil (ESPELHA a máquina
            da denúncia): tocar → confirmação calma → grava via resolvePet (PET-M2,
            isolamento kind:'pet') → estado MORNO-mas-não-spiked. SEM confete, SEM
            pico celebratório (governador §2, regra do não-spike). <=2 taps; cada
            alvo >=44px, operável por teclado. role/aria-live em cada estado para o
            AT (público em estresse não caça feedback sutil). */}
        {(pet.resolved && lifecycleState === LC_IDLE) ? null : (
        <div className="pet-detail__lifecycle">
          {lifecycleState === LC_IDLE && (
            <div className="pet-detail__lifecycle-actions" role="group" aria-label="Desfecho deste relato">
              <button
                type="button"
                className="pet-detail__lifecycle-btn pet-detail__lifecycle-btn--reunido"
                onClick={() => setLifecycleState(LC_CONFIRM_REUNIDO)}
              >
                <span aria-hidden="true">🐾</span>
                <span>Marcar como reunido</span>
              </button>
              <button
                type="button"
                className="pet-detail__lifecycle-btn pet-detail__lifecycle-btn--encerrar"
                onClick={() => setLifecycleState(LC_CONFIRM_ENCERRADO)}
              >
                Encerrar busca
              </button>
            </div>
          )}

          {lifecycleState === LC_CONFIRM_REUNIDO && (
            <div className="pet-detail__lifecycle-confirm" role="group" aria-label="Confirmar reencontro">
              <p className="pet-detail__lifecycle-note">
                Que notícia boa. Vamos marcar este pet como reunido e tirá-lo do
                mapa ativo — o relato continua guardado.
              </p>
              <div className="pet-detail__lifecycle-confirm-actions">
                <button
                  type="button"
                  className="pet-detail__lifecycle-btn pet-detail__lifecycle-btn--confirm"
                  onClick={() => handleResolve(PET_CLOSURE_REASON.REUNIDO)}
                >
                  Sim, foi reunido
                </button>
                <button
                  type="button"
                  className="pet-detail__lifecycle-btn pet-detail__lifecycle-btn--cancel"
                  onClick={() => setLifecycleState(LC_IDLE)}
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          {lifecycleState === LC_CONFIRM_ENCERRADO && (
            <div className="pet-detail__lifecycle-confirm" role="group" aria-label="Confirmar encerramento da busca">
              <p className="pet-detail__lifecycle-note">
                Tudo bem encerrar quando você decidir. Vamos tirar este relato do
                mapa ativo — ele fica guardado, e você pode relatar de novo se
                precisar.
              </p>
              <div className="pet-detail__lifecycle-confirm-actions">
                <button
                  type="button"
                  className="pet-detail__lifecycle-btn pet-detail__lifecycle-btn--confirm"
                  onClick={() => handleResolve(PET_CLOSURE_REASON.ENCERRADO)}
                >
                  Encerrar a busca
                </button>
                <button
                  type="button"
                  className="pet-detail__lifecycle-btn pet-detail__lifecycle-btn--cancel"
                  onClick={() => setLifecycleState(LC_IDLE)}
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          {lifecycleState === LC_SENDING && (
            <p className="pet-detail__lifecycle-note" aria-live="polite">
              Salvando…
            </p>
          )}

          {/* Sucesso MORNO, não um pico (governador §2): registro calmo
              "que bom — bom reencontro 🐾". role=status anuncia ao AT; tabIndex+ref
              levam o foco para cá após a transição (sem foco preso). */}
          {lifecycleState === LC_DONE_REUNIDO && (
            <p
              ref={lifecycleDoneRef}
              tabIndex={-1}
              className="pet-detail__lifecycle-note pet-detail__lifecycle-note--done"
              role="status"
            >
              <span aria-hidden="true">🐾</span> Que bom — bom reencontro. Este pet
              saiu do mapa ativo, e o relato fica guardado.
            </p>
          )}

          {/* Encerramento DIGNO: sem culpa, sem "tem certeza que quer desistir?". */}
          {lifecycleState === LC_DONE_ENCERRADO && (
            <p
              ref={lifecycleDoneRef}
              tabIndex={-1}
              className="pet-detail__lifecycle-note pet-detail__lifecycle-note--done"
              role="status"
            >
              Busca encerrada. Foi visto, foi tentado — e tudo bem parar. O relato
              fica guardado, e você pode voltar quando quiser.
            </p>
          )}

          {lifecycleState === LC_ERROR && (
            <p className="pet-detail__lifecycle-note" role="status">
              Não deu para salvar agora. Você pode tentar de novo em instantes.{' '}
              <button
                type="button"
                className="pet-detail__lifecycle-retry"
                onClick={() => setLifecycleState(LC_IDLE)}
              >
                Tentar de novo
              </button>
            </p>
          )}
        </div>
        )}

        {/* PET-M4 — denunciar (flag) um relato suspeito. Afordância CALMA e
            secundária: um botão discreto de texto que escala para um passo de
            confirmação, nunca um alarme. Persiste o flag no blob Dados (isolamento
            kind:'pet' preservado pelo writer do PET-M2). Não esconde o pin (isso é
            do servidor — handoff). Alvo >=44px, operável por teclado, rotulado. */}
        <div className="pet-detail__flag">
          {flagState === FLAG_IDLE && (
            <button
              type="button"
              className="pet-detail__flag-btn"
              onClick={() => setFlagState(FLAG_CONFIRM)}
            >
              <span aria-hidden="true">⚑</span>
              <span>Denunciar este relato</span>
            </button>
          )}

          {flagState === FLAG_CONFIRM && (
            <div className="pet-detail__flag-confirm" role="group" aria-label="Confirmar denúncia">
              <p className="pet-detail__flag-note">
                Algo parece errado com este relato? Você pode sinalizá-lo para
                revisão. Obrigado por ajudar a manter o mapa confiável.
              </p>
              <div className="pet-detail__flag-actions">
                <button
                  type="button"
                  className="pet-detail__flag-btn pet-detail__flag-btn--confirm"
                  onClick={handleFlag}
                >
                  Sim, sinalizar
                </button>
                <button
                  type="button"
                  className="pet-detail__flag-btn pet-detail__flag-btn--cancel"
                  onClick={() => setFlagState(FLAG_IDLE)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {flagState === FLAG_SENDING && (
            <p className="pet-detail__flag-note" aria-live="polite">
              Enviando sua sinalização…
            </p>
          )}

          {flagState === FLAG_DONE && (
            <p className="pet-detail__flag-note pet-detail__flag-note--done" role="status">
              Recebemos sua sinalização. Vamos revisar com calma. Obrigado por
              cuidar do mapa junto com a gente.
            </p>
          )}

          {flagState === FLAG_ERROR && (
            <p className="pet-detail__flag-note" role="status">
              Não deu para enviar a sinalização agora. Você pode tentar de novo em
              instantes.{' '}
              <button
                type="button"
                className="pet-detail__flag-retry"
                onClick={() => setFlagState(FLAG_CONFIRM)}
              >
                Tentar de novo
              </button>
            </p>
          )}
        </div>

        <div className="mdf-pin-sheet__actions">
          <button
            ref={closeRef}
            type="button"
            className="mdf-pin-sheet__close"
            onClick={() => onClose?.()}
          >
            Fechar
          </button>

          {/* PET-M19 — Compartilhar. O onClick é um handler de GESTO 100% síncrono:
              monta a mensagem + o deep-link M18 e dispara navigator.share / wa.me NO
              MESMO TICK (sem await antes — ver handleShare). <button> nativo →
              operável por teclado de graça; aria-label explícito para o AT; a
              geometria >=44px vem de .pet-detail__share-btn (min-height token). */}
          <button
            type="button"
            className="pet-detail__share-btn"
            aria-label="Compartilhar este pet"
            onClick={handleShare}
          >
            <span aria-hidden="true">📤</span>
            <span>Compartilhar</span>
          </button>

          {derived.dirHref && (
            <a
              className="mdf-pin-sheet__directions"
              href={derived.dirHref}
              target="_blank"
              rel="noreferrer"
            >
              Como chegar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
