// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Canvas starter variant — render the same governance view-model over a live
 * bpmn-js canvas, plus the L3 panels beside it.
 *
 * This is the browser counterpart to the headless variant ({@link ./headless}):
 *  - it maps a compiler result onto the {@link AnalysisResult} view-model,
 *  - registers and mounts the L3 custom elements (`@francav/components`), and
 *  - paints Axis-Y rings / Axis-X badges / finding markers onto the diagram via
 *    `@francav/bpmn-js-adapter`.
 *
 * It only needs a diagram-js host (a bpmn-js `Viewer`/`Modeler` instance) and a
 * panel container; it stays version-tolerant by going through the adapter's
 * structural service typings rather than importing bpmn-js directly.
 */

import { DpgCanvasBinding, dpgStylesheet } from "@francav/bpmn-js-adapter";
import type { DiagramServices } from "@francav/bpmn-js-adapter";
import { defineDpgElements } from "@francav/components";
import type { AnalysisResult, CompilerResultInput, DiagramElementIndex } from "@francav/components";
import { analyze } from "./headless.js";

/** The L3 panel tags the canvas variant mounts, in display order. */
export const STARTER_PANEL_TAGS = [
  "dpg-determinism-badge",
  "dpg-governance-matrix",
  "dpg-findings-panel",
] as const;

export type StarterPanelTag = (typeof STARTER_PANEL_TAGS)[number];

const STYLE_ELEMENT_ID = "dpg-starter-style";

/** A mounted canvas integration: the panels, the binding, and teardown. */
export interface MountedCanvas {
  readonly elements: Record<StarterPanelTag, HTMLElement>;
  readonly binding: DpgCanvasBinding;
  /** Re-render the panels and re-paint the canvas with a new result. */
  update(result: AnalysisResult): void;
  /** Detach the panels, remove canvas decorations, and drop the stylesheet. */
  destroy(): void;
}

export interface MountCanvasOptions {
  /**
   * Optional diagram element index, forwarded to `mapCompilerResult` so the
   * compiler's evaluation-point ids are reconciled against the canvas ids.
   */
  diagram?: DiagramElementIndex;
}

/**
 * Mount the governance panels into `panelContainer` and bind the analysis of
 * `compilerResult` onto the `viewer` canvas.
 */
export function mountCanvas(
  viewer: DiagramServices,
  panelContainer: HTMLElement,
  compilerResult: CompilerResultInput,
  options: MountCanvasOptions = {},
): MountedCanvas {
  const result = analyze(compilerResult, options.diagram);

  defineDpgElements();
  const ownerDoc = panelContainer.ownerDocument;
  injectStylesheet(ownerDoc);

  const elements = Object.fromEntries(
    STARTER_PANEL_TAGS.map((tag): [StarterPanelTag, HTMLElement] => {
      const el = ownerDoc.createElement(tag);
      panelContainer.appendChild(el);
      return [tag, el];
    }),
  ) as Record<StarterPanelTag, HTMLElement>;

  const applyResult = (next: AnalysisResult): void => {
    for (const tag of STARTER_PANEL_TAGS) {
      (elements[tag] as HTMLElement & { result?: AnalysisResult }).result = next;
    }
  };
  applyResult(result);

  const binding = new DpgCanvasBinding(viewer);
  binding.apply(result);

  return {
    elements,
    binding,
    update: (next: AnalysisResult): void => {
      applyResult(next);
      binding.apply(next);
    },
    destroy: (): void => {
      binding.clear();
      for (const el of Object.values(elements)) el.remove();
      ownerDoc.getElementById(STYLE_ELEMENT_ID)?.remove();
    },
  };
}

/** Inject the adapter's decoration stylesheet once per document. */
function injectStylesheet(target: Document): void {
  if (target.getElementById(STYLE_ELEMENT_ID)) return;
  const style = target.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = dpgStylesheet();
  (target.head ?? target.documentElement).appendChild(style);
}
