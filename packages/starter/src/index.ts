// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * dpg-starter — a lean template for building a DPG governance integration.
 *
 * Two variants share one framework-neutral core:
 *  - headless ({@link ./headless}) — compiler result → view-model → text report,
 *    runnable anywhere Node runs (see `src/cli.ts` / `npm start`); and
 *  - canvas ({@link ./canvas}) — the same view-model rendered as L3 panels plus
 *    bpmn-js overlays in the browser.
 *
 * Both consume `@francav/components`' `mapCompilerResult`; the canvas variant adds
 * `@francav/bpmn-js-adapter`. Copy this package, swap in your own compiler output and
 * BPMN, and you have a working integration. See QUICKSTART.md.
 */

export { analyze, renderReport, reportFromCompilerResult } from "./headless.js";

export { mountCanvas } from "./canvas.js";
export type { MountedCanvas, MountCanvasOptions } from "./canvas.js";

export { SAMPLE_COMPILER_RESULT, SAMPLE_BPMN, SAMPLE_ELEMENT_IDS } from "./sample.js";
