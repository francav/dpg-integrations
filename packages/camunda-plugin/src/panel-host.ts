// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * {@link DpgPanelHost} — mounts the DPG governance UI for a single diagram.
 *
 * It is the thin glue the plugin needs and nothing more:
 *  - registers the L3 custom elements (`@dpg/components`) once,
 *  - mounts the governance matrix, findings, badge and profile/policy selector
 *    panels into a host container,
 *  - binds the same {@link AnalysisResult} onto the bpmn-js canvas via
 *    `@dpg/bpmn-js-adapter`, and
 *  - seeds the profile/policy selector from the Camunda defaults.
 *
 * No governance logic lives here: the {@link AnalysisResult} is produced
 * upstream (by `@dpg/components`' `mapCompilerResult`) and handed in.
 */

import { DpgCanvasBinding, dpgStylesheet } from "@dpg/bpmn-js-adapter";
import type { DiagramServices } from "@dpg/bpmn-js-adapter";
import { defineDpgElements } from "@dpg/components";
import type { AnalysisResult, SelectorOption } from "@dpg/components";
import { DEFAULT_POLICY_ID, DEFAULT_PROFILE_ID, PLUGIN_ID } from "./manifest.js";

/** The L3 panel tag names this host mounts, in display order. */
export const PANEL_TAGS = [
  "dpg-determinism-badge",
  "dpg-governance-matrix",
  "dpg-findings-panel",
  "dpg-profile-policy-selector",
] as const;

export type PanelTag = (typeof PANEL_TAGS)[number];

const STYLE_ELEMENT_ID = `${PLUGIN_ID}-style`;

export interface PanelHostOptions {
  /** Available runtime profiles to offer in the selector. */
  profiles?: SelectorOption[];
  /** Available governance policies to offer in the selector. */
  policies?: SelectorOption[];
  /** Override the default selected profile (defaults to the Camunda profile). */
  selectedProfile?: string;
  /** Override the default selected policy. */
  selectedPolicy?: string;
  /**
   * Document the host injects the adapter stylesheet into. Defaults to the
   * panel container's owner document. Pass `null` to skip stylesheet injection
   * (e.g. when the host already provides the marker CSS).
   */
  styleTarget?: Document | null;
}

/** A mounted panel and the canvas binding it drives, for teardown/refresh. */
export interface MountedPanels {
  readonly elements: Record<PanelTag, HTMLElement>;
  readonly binding: DpgCanvasBinding;
  /** Re-render every panel and re-paint the canvas with a new result. */
  update(result: AnalysisResult): void;
  /** Detach the panels, remove canvas decorations, and drop the stylesheet. */
  destroy(): void;
}

/**
 * Mount the governance panels into `container` and bind `result` onto the
 * `diagram` canvas. The default profile/policy selection is the Camunda
 * profile (`camunda-7`) at the tier-2 baseline unless overridden.
 */
export class DpgPanelHost {
  private readonly container: HTMLElement;
  private readonly diagram: DiagramServices;

  constructor(container: HTMLElement, diagram: DiagramServices) {
    this.container = container;
    this.diagram = diagram;
  }

  mount(result: AnalysisResult, options: PanelHostOptions = {}): MountedPanels {
    defineDpgElements();

    const ownerDoc = this.container.ownerDocument;
    const styleTarget = options.styleTarget === undefined ? ownerDoc : options.styleTarget;
    if (styleTarget) injectStylesheet(styleTarget);

    const elements = this.createElements(ownerDoc);
    this.applyResult(elements, result, options);

    const binding = new DpgCanvasBinding(this.diagram);
    binding.apply(result);

    return {
      elements,
      binding,
      update: (next: AnalysisResult): void => {
        this.applyResult(elements, next, options);
        binding.apply(next);
      },
      destroy: (): void => {
        binding.clear();
        for (const el of Object.values(elements)) el.remove();
        if (styleTarget) {
          styleTarget.getElementById(STYLE_ELEMENT_ID)?.remove();
        }
      },
    };
  }

  private createElements(doc: Document): Record<PanelTag, HTMLElement> {
    const entries = PANEL_TAGS.map((tag): [PanelTag, HTMLElement] => {
      const el = doc.createElement(tag);
      this.container.appendChild(el);
      return [tag, el];
    });
    return Object.fromEntries(entries) as Record<PanelTag, HTMLElement>;
  }

  private applyResult(
    elements: Record<PanelTag, HTMLElement>,
    result: AnalysisResult,
    options: PanelHostOptions,
  ): void {
    // The L3 elements render off a `result` property; the selector additionally
    // takes profile/policy options + a default selection (Camunda profile).
    for (const tag of PANEL_TAGS) {
      const el = elements[tag] as HTMLElement & { result?: AnalysisResult };
      el.result = result;
    }

    const selector = elements["dpg-profile-policy-selector"] as HTMLElement & {
      profiles?: SelectorOption[];
      policies?: SelectorOption[];
      selectedProfile?: string | null;
      selectedPolicy?: string | null;
    };
    if (options.profiles) selector.profiles = options.profiles;
    if (options.policies) selector.policies = options.policies;
    selector.selectedProfile = options.selectedProfile ?? DEFAULT_PROFILE_ID;
    selector.selectedPolicy = options.selectedPolicy ?? DEFAULT_POLICY_ID;
  }
}

/** Inject the adapter's Axis-Y ring + decoration stylesheet once per document. */
function injectStylesheet(target: Document): void {
  if (target.getElementById(STYLE_ELEMENT_ID)) return;
  const style = target.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = dpgStylesheet();
  (target.head ?? target.documentElement).appendChild(style);
}
