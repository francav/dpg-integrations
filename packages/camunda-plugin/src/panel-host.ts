// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * {@link DpgPanelHost} — mounts the DPG governance UI for a single diagram
 * (viewer-only: static mount, no editor, no re-classify).
 *
 * It is the thin glue the plugin needs and nothing more. It builds on
 * `@francav/components`' shared {@link mountGovernancePanels} helper so it renders
 * the SAME consolidated `dpg-governance-inspector` as the reference modeler —
 * a single panel with process-overview ↔ element drill-down (the profile/policy
 * selector returns inside it). The helper owns element registration, the
 * inspector, the one-time stylesheet injection, and the delegated
 * `dpg-element-select` listener. This host additionally:
 *  - constructs the canvas {@link DpgCanvasBinding} (paint) and
 *    {@link DpgCanvasSelection} (panel→canvas focus), and
 *  - hands the adapter's overlay CSS to the helper as a string, so
 *    `@francav/components` keeps no dependency on `@francav/bpmn-js-adapter`.
 *
 * No governance logic lives here: the {@link AnalysisResult} is produced
 * upstream (by `@francav/components`' `mapCompilerResult`) and handed in. The
 * shipping client plugin uses `dpg-modeler`'s `startReferenceModeler` for the
 * LIVE editing path; this host is the viewer-only counterpart, and both now
 * mount the identical inspector via the one helper.
 */

import { DpgCanvasBinding, DpgCanvasSelection, dpgStylesheet } from "@francav/bpmn-js-adapter";
import type { DiagramServices } from "@francav/bpmn-js-adapter";
import { mountGovernancePanels } from "@francav/components";
import type { AnalysisResult, GovernancePanelsHandle, SelectorOption } from "@francav/components";
import { DEFAULT_POLICY_ID, DEFAULT_PROFILE_ID } from "./manifest.js";

/** The Camunda-default profile/policy the inspector's selector is seeded with. */
const DEFAULT_PROFILES: SelectorOption[] = [{ id: DEFAULT_PROFILE_ID, label: "Camunda 7" }];
const DEFAULT_POLICIES: SelectorOption[] = [{ id: DEFAULT_POLICY_ID, label: "Baseline Tier 2" }];

export interface PanelHostOptions {
  /**
   * Runtime-profile options for the inspector's selector. Defaults to the
   * plugin's Camunda-7 profile ({@link DEFAULT_PROFILE_ID}).
   */
  profiles?: SelectorOption[];
  /**
   * Policy-pack options for the inspector's selector. Defaults to the plugin's
   * tier-2 baseline policy ({@link DEFAULT_POLICY_ID}).
   */
  policies?: SelectorOption[];
  /** Initially selected runtime profile id. Defaults to {@link DEFAULT_PROFILE_ID}. */
  selectedProfile?: string | null;
  /** Initially selected policy id. Defaults to {@link DEFAULT_POLICY_ID}. */
  selectedPolicy?: string | null;
  /** Called when the inspector's profile selector changes. */
  onProfileChange?: (id: string) => void;
  /** Called when the inspector's policy selector changes. */
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
      layout: "inspector",
      stylesheet: dpgStylesheet(),
      // Seed the Camunda defaults; the host may override them.
      profiles: options.profiles ?? DEFAULT_PROFILES,
      policies: options.policies ?? DEFAULT_POLICIES,
      selectedProfile: options.selectedProfile ?? DEFAULT_PROFILE_ID,
      selectedPolicy: options.selectedPolicy ?? DEFAULT_POLICY_ID,
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
}
