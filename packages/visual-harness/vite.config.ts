// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { defineConfig } from "vite";

/**
 * Vite config for the DPG visual harness.
 *
 * The harness is a private workspace member; it resolves the workspace packages
 * (`@francav/bpmn-js-adapter`, `dpg-modeler`) from their built `dist/` and the
 * published packages (`@francav/components`, `@francav/compiler-browser`) +
 * `bpmn-js` from `node_modules`. No special resolution needed beyond Vite's
 * defaults, but `optimizeDeps` is widened so bpmn-js (CJS-ish internals) and the
 * compiler pre-bundle cleanly in dev.
 */
export default defineConfig({
  optimizeDeps: {
    include: ["bpmn-js/lib/NavigatedViewer", "bpmn-js/lib/Modeler"],
  },
  build: {
    // A harness, not a library — emit a plain SPA bundle.
    target: "es2022",
  },
});
