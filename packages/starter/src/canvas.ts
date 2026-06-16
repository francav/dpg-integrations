// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Canvas starter variant — render the same governance view-model over a live
 * bpmn-js canvas, plus the L3 panels beside it.
 *
 * This is the browser counterpart to the headless variant ({@link ./headless}):
 *  - it maps a compiler result onto the {@link AnalysisResult} view-model,
 *  - mounts the L3 panels via `@francav/components`' shared
 *    {@link mountGovernancePanels} helper (which owns element registration, the
 *    panel set, and the one-time stylesheet injection), and
 *  - paints Axis-Y rings / Axis-X badges / finding markers onto the diagram via
 *    `@francav/bpmn-js-adapter`.
 *
 * It only needs a diagram-js host (a bpmn-js `Viewer`/`Modeler` instance) and a
 * panel container; it stays version-tolerant by going through the adapter's
 * structural service typings rather than importing bpmn-js directly. The adapter
 * owns its overlay CSS, so the stylesheet is handed to the helper as a string —
 * `@francav/components` keeps no dependency on the adapter.
 */

import { DpgCanvasBinding, DpgCanvasSelection, dpgStylesheet } from "@francav/bpmn-js-adapter";
import type { DiagramServices } from "@francav/bpmn-js-adapter";
import { mountGovernancePanels } from "@francav/components";
import type {
  AnalysisResult,
  CompilerResultInput,
  DiagramElementIndex,
  GovernancePanelsHandle,
  SelectorOption,
} from "@francav/components";
import { analyze } from "./headless.js";

/** A mounted canvas integration: the panels, the binding, and teardown. */
export interface MountedCanvas {
  /** The shared governance-panels handle (panel set + delegated events). */
  readonly panels: GovernancePanelsHandle;
  readonly binding: DpgCanvasBinding;
  /** The canvas selection seam (panel→canvas focus). */
  readonly selection: DpgCanvasSelection;
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
  /** Runtime-profile options shown in the inspector's profile/policy selector. */
  profiles?: SelectorOption[];
  /** Policy-pack options shown in the inspector's profile/policy selector. */
  policies?: SelectorOption[];
  /** The initially selected runtime profile id. */
  selectedProfile?: string | null;
  /** The initially selected policy id. */
  selectedPolicy?: string | null;
  /** Called when the inspector's profile selector changes. */
  onProfileChange?: (id: string) => void;
  /** Called when the inspector's policy selector changes. */
  onPolicyChange?: (id: string) => void;
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

  const binding = new DpgCanvasBinding(viewer);
  const selection = new DpgCanvasSelection(viewer);

  const panels = mountGovernancePanels(panelContainer, {
    layout: "inspector",
    stylesheet: dpgStylesheet(),
    profiles: options.profiles,
    policies: options.policies,
    selectedProfile: options.selectedProfile,
    selectedPolicy: options.selectedPolicy,
    // Panel → canvas: focus the clicked element and drill the inspector into it.
    onElementSelect: (id) => {
      selection.focusElement(id);
      panels.setSelectedElement(id);
    },
    onProfileChange: options.onProfileChange,
    onPolicyChange: options.onPolicyChange,
  });
  panels.update(result);
  binding.apply(result);

  // Canvas → panel: clicking a shape on the canvas drills the inspector into
  // that element (or back to the overview when the selection is cleared).
  const unsubscribeCanvasSelect = selection.onCanvasSelect((id) => {
    panels.setSelectedElement(id);
  });

  return {
    panels,
    binding,
    selection,
    update: (next: AnalysisResult): void => {
      panels.update(next);
      binding.apply(next);
    },
    destroy: (): void => {
      unsubscribeCanvasSelect();
      binding.clear();
      panels.destroy();
    },
  };
}
