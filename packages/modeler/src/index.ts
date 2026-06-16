// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * dpg-modeler — a governance-only reference modeler.
 *
 * A lean, self-contained modeler that lets a user *edit* a BPMN process and
 * keeps its DPG governance classification live: every edit re-classifies the
 * model and re-paints the L3 governance panels (`@francav/components`) plus the
 * canvas overlays/markers (`@francav/bpmn-js-adapter`).
 *
 * It is built directly on the bpmn-js canvas adapter rather than a bespoke
 * canvas, and is deliberately governance-only: no AI assistance, no process
 * execution, no form design. Classification is injected (see {@link Classifier}),
 * so the modeler stays free of a hard, build-time compiler dependency. The
 * shipping classifier ({@link createCompilerClassifier}) is backed by the real
 * `@francav/compiler-browser` engine (loaded via an optional dynamic import); a
 * bundled dependency-free {@link sampleClassifier} remains available as a
 * test/demo fallback fixture only.
 *
 * @example
 * ```ts
 * import BpmnModeler from "bpmn-js/lib/Modeler";
 * import { startReferenceModeler, createCompilerClassifier, SAMPLE_BPMN } from "dpg-modeler";
 *
 * const editor = new BpmnModeler({ container: "#canvas" });
 * await editor.importXML(SAMPLE_BPMN);
 * const panels = document.querySelector("#panels")!;
 * const session = startReferenceModeler(editor, panels, createCompilerClassifier());
 * // edit the diagram → panels + overlays re-classify automatically via the
 * // real @francav/compiler-browser engine
 * // later: session.destroy();
 * ```
 */

export {
  DpgReferenceModeler,
  startReferenceModeler,
  DEFAULT_CHANGE_EVENTS,
  DEFAULT_PROFILE_ID,
  DEFAULT_POLICY_ID,
} from "./modeler.js";
export type { ReferenceModelerOptions, ReferenceModelerSession } from "./modeler.js";

export type { Classifier, ClassifyOptions } from "./classify.js";

export { createCompilerClassifier } from "./compilerClassifier.js";
export type { CompilerClassifierOptions } from "./compilerClassifier.js";

export {
  AVAILABLE_PROFILES,
  AVAILABLE_POLICIES,
  getProfileSnapshot,
  getPolicySnapshot,
} from "./packs.js";
export type { RuntimeProfileSnapshot, PolicySnapshot } from "./packs.js";

export type {
  EditorServices,
  EventBusService,
  XmlExporter,
  SaveXmlResult,
  DiagramEvent,
  Unsubscribe,
} from "./editor.js";

// Test/demo fallback fixtures only — NOT the shipping default (see sample.ts).
export { SAMPLE_BPMN, sampleClassifier } from "./sample.js";
