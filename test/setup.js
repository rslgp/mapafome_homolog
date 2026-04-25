// Vitest setup — runs before every test file.
// Stubs browser APIs that Leaflet / our IosKeyboardInset / sponsors expect
// but which jsdom does not implement.

import { vi } from 'vitest';

// jsdom lacks visualViewport — IosKeyboardInset reads it on mount.
if (typeof window !== 'undefined' && !window.visualViewport) {
    Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: {
            height: window.innerHeight,
            width: window.innerWidth,
            offsetTop: 0,
            offsetLeft: 0,
            scale: 1,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        },
    });
}

// jsdom does not implement matchMedia — used by prefers-reduced-motion checks.
if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = (query) => ({
        matches: false,
        media: query,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    });
}

// IntersectionObserver — used by some MUI components and our scroll cues.
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
    window.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() { return []; }
    };
}
