// VM10 — Coordinates value object.
//
// v5 § domain_driven_design.tactical_patterns.value_object: defined by
// attributes only, no identity, immutable. Replaces the [lat, lng] tuple
// + JSON.stringify pattern scattered across App.js, sheets writers, and
// reports.
//
// This module is ADDITIVE — consumers can adopt it incrementally. Existing
// [lat, lng] arrays continue to work via Coordinates.fromTuple / toTuple.

const BR_BBOX = { N: 5.27, S: -33.75, W: -73.99, E: -34.79 };
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

    isInsideBR() {
        return this.lat >= BR_BBOX.S && this.lat <= BR_BBOX.N
            && this.lng >= BR_BBOX.W && this.lng <= BR_BBOX.E;
    }

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
