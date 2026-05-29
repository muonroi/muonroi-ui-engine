import { webcrypto } from "node:crypto";
import { Buffer } from "node:buffer";

// jsdom creates its own JavaScript realm (VM context) with its own ArrayBuffer and Uint8Array
// constructors. Node.js webcrypto.subtle.importKey / verify reject these cross-realm typed arrays.
// Solution: replace jsdom's realm types with the native Node.js equivalents before any test code runs.
const NativeArrayBuffer = (Buffer.alloc(0).buffer as ArrayBuffer).constructor as typeof ArrayBuffer;
const NativeUint8Array = (Object.getPrototypeOf(Buffer.prototype) as { constructor: typeof Uint8Array }).constructor;

Object.defineProperty(globalThis, "ArrayBuffer", { configurable: true, writable: true, value: NativeArrayBuffer });
Object.defineProperty(globalThis, "Uint8Array", { configurable: true, writable: true, value: NativeUint8Array });

// Use Node.js webcrypto as the global crypto — jsdom's crypto.subtle
// rejects ArrayBuffer from Uint8Array.buffer with type mismatch errors
Object.defineProperty(globalThis, "crypto", {
  configurable: true,
  writable: true,
  value: webcrypto
});

// Polyfill ResizeObserver for jsdom test environment
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Polyfill IntersectionObserver for jsdom
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "0px";
    readonly thresholds = [0];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
}

// Polyfill DOMRect for jsdom
if (typeof globalThis.DOMRect === "undefined") {
  globalThis.DOMRect = class DOMRect {
    x = 0; y = 0; width = 0; height = 0;
    top = 0; right = 0; bottom = 0; left = 0;
    toJSON() { return {}; }
    static fromRect() { return new DOMRect(); }
  } as unknown as typeof DOMRect;
}
