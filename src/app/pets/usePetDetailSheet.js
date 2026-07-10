'use client';

// usePetDetailSheet.js, M10b: o CÉREBRO extraído da PetDetailSheet.
//
// Antes, toda a lógica (cinco máquinas de estado que resetam ao trocar de pet, os
// três effects de foco, os três memos e os três handlers) vivia inline no corpo de
// render da PetDetailSheet, um god-component de ~630 LOC. Este hook reúne esse
// estado + comportamento; a PetDetailSheet vira um renderer fino que só chama o hook
// e devolve o MESMO JSX. Extração PRESERVADORA de comportamento: nenhuma máquina de
// estado, handler, effect ou memo mudou de forma, só de casa (SRP: a lógica agora é
// testável separada do JSX; o smell de long-method fica curado no componente).
//
// Toda a documentação de POR QUE de cada bloco (a barricada de reveal temporal do
// M3, a forcing-function de reset ao trocar de pet, o contrato de gesto síncrono do
// M19, o não-spike do governador no fechamento M7b) segue nos comentários abaixo,
// palavra por palavra do original, o motivo viaja com o código.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createDirectionUrl, formatRelativeTime } from '../components/compatibility/components/mapUtils';
import { resolveContact } from '../components/compatibility/components/ux/contactLink';
import { PET_STATUS_MAP, PET_SPECIES, petCoordsKey, PET_CLOSURE_REASON, describePet } from './petDomain';
import { looksLikeDirectImageUrl } from './petPhoto';
import { buildPetShareMessage, sharePet } from './petShare';
import { flagPet, resolvePet } from './petsData';
import { t, useLocale } from '../components/compatibility/components/ux/strings';
import useBackToClose from '../components/compatibility/components/ux/useBackToClose';
import useFocusTrap from '../components/compatibility/components/ux/useFocusTrap';

// PET-M4, estados do fluxo de denúncia (flag) na própria sheet (máquina de
// estados pequena, dois passos: ocioso → confirmar → enviando → feito/erro).
// IDLE: mostra o link discreto "Denunciar"; CONFIRM: pergunta calma + confirmar/
// cancelar; SENDING: gravando; DONE: agradece e some o controle; ERROR: cópia
// calma de "não deu, tente de novo".
export const FLAG_IDLE = 'idle';
export const FLAG_CONFIRM = 'confirm';
export const FLAG_SENDING = 'sending';
export const FLAG_DONE = 'done';
export const FLAG_ERROR = 'error';

// PET-M7b, máquina de estados do FECHAMENTO (lifecycle) na própria sheet,
// ESPELHANDO o padrão de dois passos da denúncia acima. Um único state cobre os
// DOIS desfechos (reunido / encerrar busca): o passo de confirmação guarda QUAL
// motivo está pendente, então não duplicamos a máquina. Estágio E da curva
// (PET_CURVE §1-E), desfecho com confirmação GENTIL e sucesso MORNO, jamais um
// pico celebratório (governador §2, regra do não-spike).
//   IDLE:    mostra os dois botões de ação ("Marcar como reunido" / "Encerrar
//            busca"); CONFIRM_REUNIDO / CONFIRM_ENCERRADO: pergunta calma +
//            confirmar/voltar para o motivo escolhido; SENDING: gravando;
//            DONE_REUNIDO / DONE_ENCERRADO: estado morno-mas-não-spiked específico
//            de cada desfecho; ERROR: cópia calma de "não deu, tente de novo".
export const LC_IDLE = 'idle';
export const LC_CONFIRM_REUNIDO = 'confirm_reunido';
export const LC_CONFIRM_ENCERRADO = 'confirm_encerrado';
export const LC_SENDING = 'sending';
export const LC_DONE_REUNIDO = 'done_reunido';
export const LC_DONE_ENCERRADO = 'done_encerrado';
export const LC_ERROR = 'error';

// A linha descritora (describePet) é a SOT compartilhada em petDomain (petTaxonomy)
//, antes duplicada aqui, na lista e no share. Só o SPECIES_MAP local permanece:
// a sheet ainda lê o ícone/emoji da espécie (speciesMeta) abaixo.
const SPECIES_MAP = PET_SPECIES.reduce((map, s) => { map[s.id] = s; return map; }, {});

// O CÉREBRO da sheet. Recebe as mesmas props que a PetDetailSheet e devolve tudo o
// que o JSX precisa (estado derivado + máquinas de estado + setters + handlers +
// refs). `visible` cobre o guard antigo (`!open || !pet || !derived`) num único
// booleano para o renderer; quando `visible` é false, o renderer devolve null.
export function usePetDetailSheet({ open, pet, matches = [], onOpenMatch, onResolved, onClose }) {
  // PET-M23, re-render a sheet num locale switch para todo t() reler.
  useLocale();
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const dialogRef = useRef(null); // EXT-FOCUSTRAP-01: the aria-modal root the Tab-trap scopes to
  const revealRef = useRef(null);
  // PET-M7b, leva o foco para o estado de fechamento DONE depois da transição,
  // para um usuário de leitor de tela não ficar preso no botão que sumiu (mesma
  // disciplina rAF do revealRef). O nó DONE tem role=status (anúncio AT) + tabIndex.
  const lifecycleDoneRef = useRef(null);

  // PET-M3, REVEAL-ON-TAP. O contato de quem reportou NÃO é exposto ao abrir o
  // detalhe: um estranho que só passa o olho na listagem não leva o contato de
  // graça (curva §D, momento de maior vulnerabilidade do dono; ver PET_CURVE §5,
  // golpe do falso achador). O href de contato só é RESOLVIDO depois deste tap
  // explícito, antes disso, `resolveContact` nem roda sobre o dado bruto.
  const [revealed, setRevealed] = useState(false);

  // PET-M4, estado do fluxo de denúncia (dois passos). Reseta junto com o
  // reveal quando o pet aberto muda (mesma forcing-function de não-vazamento).
  const [flagState, setFlagState] = useState(FLAG_IDLE);

  // PET-M7b, estado do fluxo de FECHAMENTO (lifecycle). Reseta ao trocar de pet
  // (mesma forcing-function): um fechamento pendente de um pet jamais "vaza" para
  // o próximo aberto.
  const [lifecycleState, setLifecycleState] = useState(LC_IDLE);

  // PET-M9b, o hint "possível encontro" é DISPENSÁVEL (opt-in, não-intrusivo,
  // spec §2.1/§2.4): o dono pode fechá-lo sem agir. Reseta ao trocar de pet (igual
  // ao reveal/flag) para a dispensa de um detalhe não vazar para o próximo aberto.
  const [matchDismissed, setMatchDismissed] = useState(false);

  // PET-M15, estado de carga da FOTO (quando a URL é uma imagem direta):
  //   'loading' → mostra o skeleton enquanto o <img> baixa;
  //   'loaded'  → a imagem pintou; esconde o skeleton;
  //   'error'   → a URL quebrou/sumiu (takedown, link morto) → degrada para o
  //               placeholder calmo, NUNCA um <img> quebrado (PET-M14 §4.5).
  // Reseta ao trocar de pet (mesma forcing-function do reveal/flag), o estado de
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
    // PET-M4, a denúncia de um pet jamais "vaza" para o próximo aberto.
    if (flagState !== FLAG_IDLE) setFlagState(FLAG_IDLE);
    // PET-M7b, um fechamento pendente de um pet também não vaza para o próximo.
    if (lifecycleState !== LC_IDLE) setLifecycleState(LC_IDLE);
    // PET-M9b, a dispensa do hint também não vaza para o próximo pet aberto.
    if (matchDismissed) setMatchDismissed(false);
    // PET-M15, a carga da foto reinicia a cada pet (volta a 'loading') para o
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

  // EXT-URLSTATE-01: o BACK do Android fecha a sheet em vez de sair do site.
  // Espelha o Escape acima (fecha sem guarda de fase).
  useBackToClose(open, onClose);

  // EXT-A11Y-01 / EXT-FOCUSTRAP-01: prende Tab/Shift+Tab dentro do dialog para o
  // foco não escapar para o header do mapa / controles do Leaflet / FAB atrás do
  // modal. ADICIONA SÓ o Tab-wrap — o first-focus (closeRef, rAF), o Escape e o
  // focus-restore do effect acima permanecem intactos.
  useFocusTrap(open, dialogRef);

  const derived = useMemo(() => {
    if (!pet) return null;
    const statusMeta = PET_STATUS_MAP[pet.status] || null;
    const coords = Array.isArray(pet.coords) && pet.coords.length === 2 ? pet.coords : null;
    // Há um contato BRUTO no relato? (apenas presença, NÃO resolvemos o href
    // aqui; isso só acontece após o reveal, abaixo.) `hasContact` decide se o
    // botão "Mostrar contato" deve sequer aparecer, sem expor o dado.
    const hasContact = Boolean((pet.contact || '').trim());
    const photos = (pet.photos || '').trim();
    // PET-M15, a URL é uma IMAGEM DIRETA (renderável como <img>) ou um álbum/pasta
    // (mantém o link "Ver as fotos do pet")? looksLikeDirectImageUrl é conservador:
    // só true para um caminho que termina em extensão de imagem conhecida, um
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
      speciesLabel: speciesMeta ? t(`pets.species.${speciesMeta.id}.label`) : t('pets.detail.species.fallback'),
      timeSince: formatRelativeTime(pet.dateIso),
      hasContact,
    };
  }, [pet]);

  // O href só é construído DEPOIS do tap (revealed), a barricada de PII é
  // temporal, não só visual: enquanto não revelado, o contato bruto nunca vira
  // um link clicável no DOM. Memoizado por pet+revealed para não re-resolver a
  // cada render.
  const revealedContact = useMemo(() => {
    if (!pet || !revealed) return null;
    return resolveContact(pet.contact);
  }, [pet, revealed]);

  // PET-M9b, "possível encontro" (opt-in, calmo, NUNCA certo). `matches` já vem
  // do predicado PURO (findPossibleMatches) com o LIMIAR DE SILÊNCIO aplicado:
  // pares fracos/coringa NUNCA chegam aqui (spec §3). Mostramos só o MELHOR
  // candidato (matches[0], já ordenado) → UMA próxima decisão calma: ver o outro
  // relato (spec §2.3). NENHUM score/porcentagem é exposto (banido §2.2); o tom é
  // "pode ser", não "encontramos" (§2.2). O link ao candidato usa a identidade
  // M18 (petCoordsKey), a mesma SOT do deep-link, então abrir o outro relato é a
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
    // o registro "possível", calmo, sem certeza, spec §2.2/§2.4).
    const openIsLost = pet.status === 'perdido';
    const lead = openIsLost
      ? t('pets.detail.match.lead.lost')
      : t('pets.detail.match.lead.found');
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

  // PET-M4, confirma e grava a denúncia. Persiste o flag no blob Dados via o
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

  // PET-M7b, confirma e grava o FECHAMENTO (reunido / encerrar busca). Espelha
  // handleFlag: persiste pelo writer coords-keyed do PET-M2 (resolvePet →
  // updatePetByCoords), que reescreve SÓ a coluna Dados (resolvedAt + closureReason)
  // e só casa uma linha de pet (isolamento). A idempotency_key é DERIVADA das coords
  // do pet, então um re-tap não regrava (reusa o cache de petsData). Async é
  // aceitável (não é um gesto sensível de share/clipboard, é uma escrita comum).
  // Em sucesso, AVISA o PetsApp (onResolved) para atualizar o pet no estado: o
  // marcador reunido do M11 renderiza e o pet sai do mapa ativo na hora. Degrada
  // com calma para ERROR se a gravação falhar, sem culpa, sem alarme.
  const handleResolve = async (reason) => {
    if (!pet) return;
    setLifecycleState(LC_SENDING);
    // Carimba o ISO AQUI (uma vez) e passa ao writer E ao onResolved, para o pet
    // otimista no estado bater com o que foi gravado (mesmo resolvedAt, LSP).
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

  // PET-M19, COMPARTILHAR (WhatsApp / native share). Handler de GESTO: tudo aqui
  // é SÍNCRONO. A mensagem + o deep-link M18 são montados pela fn PURA
  // (buildPetShareMessage) e sharePet dispara navigator.share / abre wa.me NO MESMO
  // TICK do clique, SEM await antes, ou o browser mobile descarta o gesto (perde a
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

  // `visible` = o guard antigo (`!open || !pet || !derived`) num só booleano; o
  // renderer devolve null quando é false. Todo o resto é o que o JSX consumia
  // inline antes da extração.
  return {
    visible: Boolean(open && pet && derived),
    derived,
    refs: { closeRef, dialogRef, revealRef, lifecycleDoneRef },
    revealed,
    setRevealed,
    revealedContact,
    matchHint,
    matchDismissed,
    setMatchDismissed,
    flagState,
    setFlagState,
    lifecycleState,
    setLifecycleState,
    photoLoadState,
    setPhotoLoadState,
    handleFlag,
    handleResolve,
    handleShare,
    onOpenMatch,
    onClose,
  };
}
