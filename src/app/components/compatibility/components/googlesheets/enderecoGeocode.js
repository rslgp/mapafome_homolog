// enderecoGeocode.js — EXT-EH-05 pure geocode-decision seam (Sprout Function).
//
// endereco.js's handleSubmit runs inside a fire-and-forget async IIFE that reaches
// into module-private singletons (the google-spreadsheet `doc` and the
// leaflet-geosearch `provider`), which makes the WRITE decision impossible to unit
// test deterministically. This module extracts the ONE piece that carries the
// ghost-pin bug — "given the row's Dados JSON and the geocoder's result, produce
// the new Dados stamped with Coordinates, or REJECT the address" — as a pure,
// side-effect-free function so it can be tested directly.
//
// Behavior is byte-for-byte the same as the original inline block:
//   • dadosJSON = JSON.parse(dadosString)
//   • if the provider returned at least one hit → latlon = [hit.y, hit.x],
//     dadosJSON.Coordinates = JSON.stringify(latlon).replace(" ",""), return the
//     re-stringified Dados.
//   • else → throw new Error("endereco-nao-encontrado") so the caller's catch runs
//     (surface the error to the user, do NOT write a ghost row).
// Keeping this a throw preserves the original control flow exactly; the caller
// decides what a throw means (alert + abort the append).

export function resolveDadosWithCoordinates(dadosString, providerResult) {
  const dadosJSON = JSON.parse(dadosString);

  if (providerResult && providerResult.length !== 0) {
    const latlon = [providerResult[0].y, providerResult[0].x];
    dadosJSON.Coordinates = JSON.stringify(latlon).replace(' ', '');
    return JSON.stringify(dadosJSON); // Convert obj to string
  }

  // No geocode hit → the address could not be located. Reject so the caller
  // aborts the write instead of publishing a pin with no Coordinates.
  throw new Error('endereco-nao-encontrado');
}
