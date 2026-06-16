// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * dpg-modeler — a governance-only reference modeler.
 *
 * A lean, self-contained modeler that lets a user *edit* a BPMN process and
 * keeps its DPG governance classification live: every edit re-classifies the
 * model and re-paints the L3 governance panels (`@dpg/components`) plus the
 * canvas overlays/markers (`@dpg/bpmn-js-adapter`).
 *
 * It is built directly on the bpmn-js canvas adapter rather than a bespoke
 * canvas, and is deliberately governance-only: no AI assistance, no process
 * execution, no form design. Classification is injected (see {@link Classifier}),
 * so the modeler stays free of a hard compiler dependency; a bundled
 * dependency-free sample classifier ({@link sampleClassifier}) lets it run with
 * no external deps out of the box.
 *
 * @example
 * ```ts
 * import BpmnModeler from "bpmn-js/lib/Modeler";
 * import { startReferenceModeler, sampleClassifier, SAMPLE_BPMN } from "dpg-modeler";
 *
 * const editor = new BpmnModeler({ container: "#canvas" });
 * await editor.importXML(SAMPLE_BPMN);
 * const panels = document.querySelector("#panels")!;
 * const session = startReferenceModeler(editor, panels, sampleClassifier);
 * // edit the diagram → panels + overlays re-classify automatically
 * // later: session.destroy();
 * ```
 */

export {
  DpgReferenceModeler,
  startReferenceModeler,
  MODELER_PANEL_TAGS,
  DEFAULT_CHANGE_EVENTS,
} from "./modeler.js";
export type {
  ReferenceModelerOptions,
  ReferenceModelerSession,
  ModelerPanelTag,
} from "./modeler.js";

export type { Classifier } from "./classify.js";

export type {
  EditorServices,
  EventBusService,
  XmlExporter,
  SaveXmlResult,
  DiagramEvent,
  Unsubscribe,
} from "./editor.js";

export { SAMPLE_BPMN, sampleClassifier } from "./sample.js";
