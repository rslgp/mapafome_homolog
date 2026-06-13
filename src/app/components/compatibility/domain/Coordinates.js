// VM10 — Coordinates value object.
//
// v5 § domain_driven_design.tactical_patterns.value_object: defined by
// attributes only, no identity, immutable. Replaces the [lat, lng] tuple
// + JSON.stringify pattern scattered across App.js, sheets writers, and
// reports.
//
// This module is ADDITIVE — consumers can adopt it incrementally. Existing
// [lat, lng] arrays continue to work via Coordinates.fromTuple / toTuple.

// INTL M2 (§4.5): the private Brazil bbox literal and the isInsideBR() method were
// REMOVED here. isInsideBR() had ZERO production consumers (only domain.test.js),
// and its box was a fourth duplicate of the bounds. The single source of truth for
// the publish geofence is now countries.COUNTRY_PUBLISH_BOUNDS via
// isInsideCountry(coords, code). A value-object isInsideCountry(code) was NOT added
// here on purpose: with no production caller it would be a cargo-culted abstraction
// (rule_of_three: <3 consumers) AND would force this leaf value object to import the
// country SOT for nothing. Re-add it only when a real consumer needs it (FIT-1: the
// bounds literal survives only in countries.js).
const EARTH_RADIUS_KM = 6371;

function toRad(deg) { return (deg * Math.PI) / 180; }

export class Coordinates {
    constructor(lat, lng) {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new TypeError('Coordinates: lat/lng must be finite numbers');
        }
        Object.defineProperty(this, 'lat', { value: lat, writable: false, enumerable: true });
        Object.defineProperty(this, 'lng', { value: lng, writable: false, enumerable: true });
        Object.freeze(this);
    }

    static fromTuple(tuple) {
        if (!Array.isArray(tuple) || tuple.length !== 2) {
            throw new TypeError('Coordinates.fromTuple: expected [lat, lng]');
        }
        return new Coordinates(tuple[0], tuple[1]);
    }

    static parse(jsonOrString) {
        if (typeof jsonOrString === 'string') {
            return Coordinates.fromTuple(JSON.parse(jsonOrString));
        }
        return Coordinates.fromTuple(jsonOrString);
    }

    toTuple() { return [this.lat, this.lng]; }
    toJSON() { return [this.lat, this.lng]; }
    toString() { return `${this.lat},${this.lng}`; }

    distanceKmTo(other) {
        if (!(other instanceof Coordinates)) other = Coordinates.fromTuple(other);
        const dLat = toRad(other.lat - this.lat);
        const dLon = toRad(other.lng - this.lng);
        const la1 = toRad(this.lat);
        const la2 = toRad(other.lat);
        const h = Math.sin(dLat / 2) ** 2
            + Math.sin(dLon / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
        return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    }

    equals(other) {
        if (!(other instanceof Coordinates)) return false;
        return this.lat === other.lat && this.lng === other.lng;
    }
}
