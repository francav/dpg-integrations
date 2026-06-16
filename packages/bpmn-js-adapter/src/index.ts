// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * @francav/bpmn-js-adapter — bind a DPG governance analysis onto a bpmn-js canvas.
 *
 * Given a bpmn-js instance (`BpmnModeler`/`BpmnViewer`/`NavigatedViewer`, or any
 * diagram-js host exposing the `overlays`, `canvas`, and `elementRegistry`
 * services) and an {@link AnalysisResult} from `@francav/components`, this paints:
 *  - an Axis-Y determinism ring (CSS marker) on each classified element,
 *  - an Axis-X coupling badge (overlay), and
 *  - a per-element finding marker (overlay, worst severity).
 *
 * The binding is version-tolerant (structural service typings, no hard bpmn-js
 * import) and reversible (`clear()` / re-`apply()`).
 *
 * @example
 * ```ts
 * import BpmnViewer from "bpmn-js/lib/NavigatedViewer";
 * import { bindAnalysisToCanvas, dpgStylesheet } from "@francav/bpmn-js-adapter";
 *
 * document.head.insertAdjacentHTML("beforeend", `<style>${dpgStylesheet()}</style>`);
 * const viewer = new BpmnViewer({ container: "#canvas" });
 * await viewer.importXML(bpmnXml);
 * const binding = bindAnalysisToCanvas(viewer, analysisResult);
 * // later: binding.clear();
 * ```
 */

export { DpgCanvasBinding, bindAnalysisToCanvas } from "./binding.js";
export type { BindingOptions, ApplyReport } from "./binding.js";

export {
  AXIS_Y_STYLE,
  AXIS_X_STYLE,
  FINDING_STYLE,
  FINDING_SEVERITY_RANK,
} from "./presentation.js";
export type { AxisYStyle, AxisXStyle, AxisXBadgeShape, FindingStyle } from "./presentation.js";

export {
  DPG_CLASS_PREFIX,
  axisXBadgeHtml,
  axisYMarkerClass,
  findingMarkerHtml,
  dpgStylesheet,
  escapeHtml,
} from "./overlay-html.js";

export type {
  DiagramServices,
  DiagramElement,
  OverlaysService,
  CanvasService,
  ElementRegistryService,
  OverlayAttrs,
  OverlayPosition,
} from "./bpmn-js.js";
