import '@testing-library/jest-dom';

// Polyfill Request/Response for jsdom environment (needed for Hono tests)
import { Request as NodeRequest, Response as NodeResponse } from 'node-fetch';

if (typeof globalThis.Request === 'undefined') {
  (globalThis as Record<string, unknown>).Request = NodeRequest;
}
if (typeof globalThis.Response === 'undefined') {
  (globalThis as Record<string, unknown>).Response = NodeResponse;
}

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(7),
  },
});

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();
