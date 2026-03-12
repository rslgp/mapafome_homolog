// markerDataUtils.js
// Aggregates per-marker data into the dadosPopup shape that CoffeeMap.configPopup expects.
//
// Pure transformation functions live in the existing mapUtils.js:
//   createDirectionUrl   → googleDirection
//   formatRelativeTime   → dateMarked
//   formatPhoneNumber    → telefoneData  (returns {formatted, url, isLink} — NOT JSX;
//                                         JSX rendering happens in configPopup)
//   calculateRating      → Avaliacao
//   shouldApplyFilter    → filter predicate
//   isWithinTimeThreshold→ teste age gate
//   isMobileDevice       → zoom calculation
//
// This file owns only the assembly step.

import {
    createDirectionUrl,
    formatRelativeTime,
    formatPhoneNumber,
    calculateRating,
} from './mapUtils';

/**
 * Builds the dadosPopup object from a raw dataItem and its roaster config.
 * Phone data is kept as a plain object here; CoffeeMap.configPopup renders the JSX.
 *
 * @param {Object} dataItem   - Raw item from dataMapsProp
 * @param {Object} config     - Entry from ROASTER_CONFIGS
 * @returns {Object} dadosPopup ready for configPopup()
 */
export const buildDadosPopup = (dataItem, config) => {
    const { mapCoords, DateISO, Telefone, Avaliacao } = dataItem;

    return {
        ...dataItem,
        precisandoMsg:   config.getMessage(dataItem),
        googleDirection: createDirectionUrl(mapCoords),
        dateMarked:      formatRelativeTime(DateISO),
        telefoneData:    formatPhoneNumber(Telefone),   // {formatted, url, isLink}
        Avaliacao:       calculateRating(Avaliacao),
    };
};
