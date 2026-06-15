// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * {@link DpgCanvasBinding} — binds a DPG analysis view-model onto a live
 * bpmn-js (or bare diagram-js) canvas as overlays and CSS markers.
 *
 * Responsibilities:
 *  - Resolve compiler/view-model element ids against the diagram's actual ids
 *    (tolerating namespace-prefixed ids the compiler may emit).
 *  - Paint an Axis-Y determinism ring (CSS marker), an Axis-X coupling badge
 *    (overlay), and a per-element finding marker (overlay, worst severity).
 *  - Be idempotent and reversible: {@link DpgCanvasBinding.apply} clears its own
 *    prior decorations first, and {@link DpgCanvasBinding.clear} removes them.
 *
 * It touches only the long-stable `overlays`, `canvas`, and `elementRegistry`
 * services (see {@link ./bpmn-js}), so it is tolerant of the bpmn-js version.
 */

import type { AnalysisResult, Finding, FindingSeverity } from "@dpg/components";
import type {
  CanvasService,
  DiagramServices,
  ElementRegistryService,
  OverlaysService,
} from "./bpmn-js.js";
import { AXIS_X_STYLE } from "./presentation.js";
import { FINDING_SEVERITY_RANK } from "./presentation.js";
import {
  DPG_CLASS_PREFIX,
  axisXBadgeHtml,
  axisYMarkerClass,
  findingMarkerHtml,
} from "./overlay-html.js";

const OVERLAY_TYPE = `${DPG_CLASS_PREFIX}-governance`;

/** Which decorations the binding paints. All default to on. */
export interface BindingOptions {
  determinismRing?: boolean;
  couplingBadge?: boolean;
  findingMarkers?: boolean;
}

/** What a single `apply()` actually changed — useful for tests and harnesses. */
export interface ApplyReport {
  /** view-model element ids matched to a diagram element. */
  matched: string[];
  /** view-model element ids with no diagram element (skipped). */
  unmatched: string[];
  markersAdded: number;
  overlaysAdded: number;
}

interface ResolvedServices {
  overlays: OverlaysService;
  canvas: CanvasService;
  registry: ElementRegistryService;
}

/** Pick the worst-severity finding count for an element. */
function worstFinding(findings: Finding[]): { severity: FindingSeverity; count: number } | null {
  if (findings.length === 0) return null;
  let severity: FindingSeverity = "info";
  for (const f of findings) {
    if (FINDING_SEVERITY_RANK[f.severity] > FINDING_SEVERITY_RANK[severity]) {
      severity = f.severity;
    }
  }
  return { severity, count: findings.length };
}

export class DpgCanvasBinding {
  private readonly services: ResolvedServices;
  private readonly options: Required<BindingOptions>;

  /** diagram element ids this binding currently has a marker on. */
  private markedElements = new Set<string>();
  /** overlay ids this binding currently owns. */
  private overlayIds: string[] = [];

  constructor(diagram: DiagramServices, options: BindingOptions = {}) {
    this.services = {
      overlays: diagram.get("overlays"),
      canvas: diagram.get("canvas"),
      registry: diagram.get("elementRegistry"),
    };
    this.options = {
      determinismRing: options.determinismRing ?? true,
      couplingBadge: options.couplingBadge ?? true,
      findingMarkers: options.findingMarkers ?? true,
    };
  }

  /**
   * Resolve a view-model element id to a diagram element id. Tries the id
   * verbatim, then the local part after the last `:` / `}` namespace separator,
   * so a compiler id like `ns:Task_1` still lands on diagram `Task_1`.
   */
  private resolveId(elementId: string): string | undefined {
    if (this.services.registry.get(elementId)) return elementId;
    const sep = Math.max(elementId.lastIndexOf(":"), elementId.lastIndexOf("}"));
    if (sep >= 0) {
      const local = elementId.slice(sep + 1);
      if (local && this.services.registry.get(local)) return local;
    }
    return undefined;
  }

  /** Group findings by their (resolved) target element id. */
  private findingsByElement(result: AnalysisResult): Map<string, Finding[]> {
    const byElement = new Map<string, Finding[]>();
    for (const finding of result.findings) {
      if (!finding.elementId) continue;
      const id = this.resolveId(finding.elementId);
      if (!id) continue;
      const list = byElement.get(id);
      if (list) list.push(finding);
      else byElement.set(id, [finding]);
    }
    return byElement;
  }

  /**
   * Paint the view-model onto the canvas. Clears this binding's prior
   * decorations first, so it is safe to call repeatedly (e.g. on re-analysis).
   */
  apply(result: AnalysisResult): ApplyReport {
    this.clear();

    const report: ApplyReport = {
      matched: [],
      unmatched: [],
      markersAdded: 0,
      overlaysAdded: 0,
    };

    const findingsByElement = this.options.findingMarkers
      ? this.findingsByElement(result)
      : new Map<string, Finding[]>();

    // Union of every element id the view-model has something to say about.
    const candidateIds = new Set<string>([
      ...Object.keys(result.determinismMap),
      ...result.findings.map((f) => f.elementId).filter((id): id is string => Boolean(id)),
    ]);

    for (const rawId of candidateIds) {
      const id = this.resolveId(rawId);
      if (!id) {
        report.unmatched.push(rawId);
        continue;
      }
      report.matched.push(rawId);

      const entry = result.determinismMap[rawId] ?? result.determinismMap[id];

      if (entry && this.options.determinismRing) {
        this.services.canvas.addMarker(id, axisYMarkerClass(entry.axisY));
        this.markedElements.add(id);
        report.markersAdded += 1;
      }

      if (entry && this.options.couplingBadge && AXIS_X_STYLE[entry.axisX].shape) {
        const html = axisXBadgeHtml(entry.axisX);
        if (html) {
          this.addOverlay(id, { top: -6, right: 6 }, html);
          report.overlaysAdded += 1;
        }
      }

      const worst = worstFinding(findingsByElement.get(id) ?? []);
      if (worst) {
        this.addOverlay(
          id,
          { bottom: -6, left: -6 },
          findingMarkerHtml(worst.severity, worst.count),
        );
        report.overlaysAdded += 1;
      }
    }

    return report;
  }

  private addOverlay(
    elementId: string,
    position: { top?: number; bottom?: number; left?: number; right?: number },
    html: string,
  ): void {
    const overlayId = this.services.overlays.add(elementId, OVERLAY_TYPE, {
      position,
      html,
      scale: false,
    });
    this.overlayIds.push(overlayId);
  }

  /** Remove every decoration this binding added. Idempotent. */
  clear(): void {
    for (const id of this.markedElements) {
      // Markers carry the axis-y class; remove all three defensively.
      this.services.canvas.removeMarker(id, axisYMarkerClass("fullyDeterministic"));
      this.services.canvas.removeMarker(id, axisYMarkerClass("policyDependent"));
      this.services.canvas.removeMarker(id, axisYMarkerClass("runtimeBound"));
    }
    this.markedElements.clear();

    for (const overlayId of this.overlayIds) {
      this.services.overlays.remove({ id: overlayId });
    }
    this.overlayIds = [];
  }
}

/**
 * Convenience: create a binding and immediately apply `result`. Returns the
 * binding so the caller can {@link DpgCanvasBinding.clear} or re-apply later.
 */
export function bindAnalysisToCanvas(
  diagram: DiagramServices,
  result: AnalysisResult,
  options?: BindingOptions,
): DpgCanvasBinding {
  const binding = new DpgCanvasBinding(diagram, options);
  binding.apply(result);
  return binding;
}
