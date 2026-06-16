// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Node DOM guard for the headless variant.
 *
 * `@dpg/components` is a single entry point that bundles both the
 * framework-neutral view-model (which the headless path uses) and the L3 custom
 * elements (which extend `HTMLElement` at module-evaluation time). Importing it
 * in a plain Node process therefore needs `HTMLElement`/`customElements` to at
 * least exist, even though the headless path never constructs an element.
 *
 * This installs inert stand-ins **only when no DOM is present** (i.e. real
 * browsers and jsdom are untouched). It must be imported before `@dpg/components`
 * — ES module imports are hoisted, so it lives in its own module and is imported
 * first by {@link ./headless}.
 */

const g = globalThis as Record<string, unknown>;

if (typeof g["HTMLElement"] === "undefined") {
  // Minimal inert base: the headless path never instantiates a custom element,
  // so an empty class is enough to let the module graph evaluate.
  g["HTMLElement"] = class {};
}

if (typeof g["customElements"] === "undefined") {
  g["customElements"] = {
    get: (): undefined => undefined,
    define: (): void => undefined,
    whenDefined: (): Promise<void> => Promise.resolve(),
    upgrade: (): void => undefined,
  };
}
