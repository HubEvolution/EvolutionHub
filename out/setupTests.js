"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Import jest-dom (Vitest compatible) for better assertions
require("@testing-library/jest-dom/vitest");
const vitest_1 = require("vitest");
const vitest_2 = require("vitest");
const react_1 = require("@testing-library/react");
const react_2 = require("react");
// Mock Astro components
vitest_1.vi.mock('astro', () => ({
    __esModule: true,
    default: function MockAstroComponent({ children }) {
        return react_2.default.createElement('div', { 'data-testid': 'astro-component' }, children);
    },
}));
// Keep global assignment untyped to avoid module augmentation issues
// Mock Astro global
const g = globalThis;
if (!g.Astro) {
    g.Astro = {
        request: { url: new URL('http://localhost:3000/') },
        params: {},
        props: {},
        redirect: vitest_1.vi.fn().mockImplementation((url) => ({
            status: 302,
            headers: new Headers({ Location: url }),
        })),
        response: {
            headers: new Headers(),
            status: 200,
            statusText: 'OK',
        },
    };
}
// Add window.matchMedia mock
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vitest_1.vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vitest_1.vi.fn(),
        removeListener: vitest_1.vi.fn(),
        addEventListener: vitest_1.vi.fn(),
        removeEventListener: vitest_1.vi.fn(),
        dispatchEvent: vitest_1.vi.fn(),
    })),
});
// Mock ResizeObserver for components using it
if (!g.ResizeObserver) {
    class MockResizeObserver {
        observe() { }
        unobserve() { }
        disconnect() { }
    }
    g.ResizeObserver = MockResizeObserver;
}
// Mock URL.createObjectURL / revokeObjectURL used by image previews
if (!('createObjectURL' in URL)) {
    URL.createObjectURL =
        vitest_1.vi.fn(() => 'blob:mock');
}
if (!('revokeObjectURL' in URL)) {
    URL.revokeObjectURL =
        vitest_1.vi.fn();
}
// Polyfill Blob/File.arrayBuffer when missing (some jsdom envs)
try {
    if (typeof Blob !== 'undefined' && !('arrayBuffer' in Blob.prototype)) {
        Object.defineProperty(Blob.prototype, 'arrayBuffer', {
            value: async function () {
                // Return small deterministic buffer without relying on stream()
                return new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
            },
            configurable: true,
            writable: true,
        });
    }
    if (typeof File !== 'undefined' && !('arrayBuffer' in File.prototype)) {
        Object.defineProperty(File.prototype, 'arrayBuffer', {
            value: async function () {
                return new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
            },
            configurable: true,
            writable: true,
        });
    }
}
catch {
    // Ignore polyfill setup failures
}
// Ensure React Testing Library cleans up between tests and mocks reset
(0, vitest_2.afterEach)(() => {
    vitest_1.vi.restoreAllMocks();
    (0, react_1.cleanup)();
});
