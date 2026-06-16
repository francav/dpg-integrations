// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * {@link DpgPanelHost} — mounts the DPG governance UI for a single diagram
 * (viewer-only: static mount, no editor, no re-classify).
 *
 * It is the thin glue the plugin needs and nothing more. It builds on
 * `@francav/components`' shared {@link mountGovernancePanels} helper so it renders
 * the SAME flat panel set as the reference modeler — resolving the historical
 * 3-vs-4 contradiction (the standalone profile/policy selector is dropped for
 * now and returns inside the consolidated inspector in F.3c). The helper owns
 * element registration, the panel set, the one-time stylesheet injection, and
 * the delegated `dpg-element-select` listener. This host additionally:
 *  - constructs the canvas {@link DpgCanvasBinding} (paint) and
 *    {@link DpgCanvasSelection} (panel→canvas focus), and
 *  - hands the adapter's overlay CSS to the helper as a string, so
 *    `@francav/components` keeps no dependency on `@francav/bpmn-js-adapter`.
 *
 * No governance logic lives here: the {@link AnalysisResult} is produced
 * upstream (by `@francav/components`' `mapCompilerResult`) and handed in. The
 * shipping client plugin uses `dpg-modeler`'s `startReferenceModeler` for the
 * LIVE editing path; this host is the viewer-only counterpart, and both now
 * mount the identical panel set via the one helper.
 */

import { DpgCanvasBinding, DpgCanvasSelection, dpgStylesheet } from "@francav/bpmn-js-adapter";
import type { DiagramServices } from "@francav/bpmn-js-adapter";
import { mountGovernancePanels } from "@francav/components";
import type { AnalysisResult, GovernancePanelsHandle } from "@francav/components";

export interface PanelHostOptions {
  /**
   * Called when the (future inspector) profile selector changes. Defined now
   * for parity with the helper; unused in the flat layout, which has no
   * selector. Ready for F.3c.
   */
  onProfileChange?: (id: string) => void;
  /** Called when the (future inspector) policy selector changes. See above. */
  onPolicyChange?: (id: string) => void;
}

/** A mounted panel and the canvas binding it drives, for teardown/refresh. */
export interface MountedPanels {
  /** The shared governance-panels handle (panel set + delegated events). */
  readonly panels: GovernancePanelsHandle;
  readonly binding: DpgCanvasBinding;
  /** The canvas selection seam (panel→canvas focus). */
  readonly selection: DpgCanvasSelection;
  /** Re-render every panel and re-paint the canvas with a new result. */
  update(result: AnalysisResult): void;
  /** Detach the panels, remove canvas decorations, and drop the stylesheet. */
  destroy(): void;
}

/**
 * Mount the governance panels into `container` and bind `result` onto the
 * `diagram` canvas. Viewer-only: a static snapshot of one analysis, with
 * panel→canvas selection sync but no re-classification.
 */
export class DpgPanelHost {
  private readonly container: HTMLElement;
  private readonly diagram: DiagramServices;

  constructor(container: HTMLElement, diagram: DiagramServices) {
    this.container = container;
    this.diagram = diagram;
  }

  mount(result: AnalysisResult, options: PanelHostOptions = {}): MountedPanels {
    const binding = new DpgCanvasBinding(this.diagram);
    const selection = new DpgCanvasSelection(this.diagram);

    const panels = mountGovernancePanels(this.container, {
      stylesheet: dpgStylesheet(),
      onElementSelect: (id) => {
        selection.focusElement(id);
        panels.setSelectedElement(id);
      },
      onProfileChange: options.onProfileChange,
      onPolicyChange: options.onPolicyChange,
    });
    panels.update(result);
    binding.apply(result);

    return {
      panels,
      binding,
      selection,
      update: (next: AnalysisResult): void => {
        panels.update(next);
        binding.apply(next);
      },
      destroy: (): void => {
        binding.clear();
        panels.destroy();
      },
    };
  }
}
