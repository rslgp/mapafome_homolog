// subscriptionConfig.js: single source of truth for subscription money limits.
//
// MIN_SUBSCRIPTION_VALUE is the front-end floor (in R$) for a recurring donation.
// It lives here, once, so the two front-end consumers that enforce it stay in sync:
//   1. validateBeforeSubmit() in asaasSubscriptionClient.js (client-side guard)
//   2. the amount <input min={...}> in src/app/assinar/page.js (native browser min)
// Before this module, the literal 5 was copied into both places, so a change in one
// layer would mis-validate against the other (money SOT drift).
//
// NOTE: the asaas-backend is a SEPARATE package and cannot import from src/. Its
// authoritative server-side floor lives in asaas-backend/lib/validate.js and MUST
// be kept equal to this number by convention, because there is no shared import.
export const MIN_SUBSCRIPTION_VALUE = 5;
