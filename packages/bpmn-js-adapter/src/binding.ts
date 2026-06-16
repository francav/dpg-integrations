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

import type { AnalysisResult, Finding, FindingSeverity } from "@francav/components";
import type {
  CanvasService,
  DiagramElement,
  DiagramServices,
  ElementRegistryService,
  EventBusService,
  OverlaysService,
  SelectionService,
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

/**
 * Resolve a view-model / compiler element id to a diagram element id via the
 * `elementRegistry`. Tries the id verbatim, then the local part after the last
 * `:` / `}` namespace separator, so a compiler id like `ns:Task_1` still lands
 * on diagram `Task_1`. Returns `undefined` if no diagram element matches.
 */
export function resolveDiagramId(
  registry: ElementRegistryService,
  elementId: string,
): string | undefined {
  if (registry.get(elementId)) return elementId;
  const sep = Math.max(elementId.lastIndexOf(":"), elementId.lastIndexOf("}"));
  if (sep >= 0) {
    const local = elementId.slice(sep + 1);
    if (local && registry.get(local)) return local;
  }
  return undefined;
}

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
   * Resolve a view-model element id to a diagram element id via the shared
   * {@link resolveDiagramId} helper (tolerates namespace-prefixed ids).
   */
  private resolveId(elementId: string): string | undefined {
    return resolveDiagramId(this.services.registry, elementId);
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
      // An editing host (e.g. the reference modeler) may have deleted the
      // element since it was marked; skip ids no longer in the diagram so
      // clear() stays safe across edits.
      if (!this.services.registry.get(id)) continue;
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

/** Payload diagram-js emits on the `selection.changed` event. Structural. */
interface SelectionChangedEvent {
  newSelection?: DiagramElement[];
}

/**
 * {@link DpgCanvasSelection} — read/drive the canvas selection of a bpmn-js (or
 * bare diagram-js) host, the companion read/navigate seam to the write-only
 * {@link DpgCanvasBinding}.
 *
 * It lets a governance panel programmatically select and pan to an element
 * (panel → canvas), and lets a host observe canvas selection changes (canvas →
 * panel). Like the binding, it imports no `bpmn-js` and touches only structural
 * services resolved through {@link DiagramServices.get}. Every service is
 * resolved lazily and tolerantly: if `selection`, `eventBus`, or
 * `scrollToElement` is absent (an older or bare host), the corresponding method
 * degrades to a graceful no-op (returning `false`) rather than throwing.
 */
export class DpgCanvasSelection {
  private readonly diagram: DiagramServices;

  constructor(diagram: DiagramServices) {
    this.diagram = diagram;
  }

  /** Lazily resolve a service, swallowing a host that throws on unknown names. */
  private service<T>(name: string): T | undefined {
    try {
      return this.diagram.get<T>(name) ?? undefined;
    } catch {
      return undefined;
    }
  }

  private get registry(): ElementRegistryService | undefined {
    return this.service<ElementRegistryService>("elementRegistry");
  }

  /**
   * Select `elementId` on the canvas. Resolves the id via the registry, then
   * calls `selection.select(el)`. Returns `false` (no-op) if the `selection`
   * service or the element is unavailable.
   */
  selectElement(elementId: string): boolean {
    const selection = this.service<SelectionService>("selection");
    if (!selection) return false;
    const registry = this.registry;
    const resolved = registry ? resolveDiagramId(registry, elementId) : undefined;
    const element = resolved && registry ? registry.get(resolved) : undefined;
    if (!element) return false;
    selection.select(element);
    return true;
  }

  /**
   * Pan/scroll the viewport so `elementId` is in view, preferring
   * `canvas.scrollToElement`. Returns `false` if the canvas, the navigation
   * method, or the element is unavailable.
   */
  centerElement(elementId: string): boolean {
    const canvas = this.service<CanvasService>("canvas");
    if (!canvas || typeof canvas.scrollToElement !== "function") return false;
    const registry = this.registry;
    const resolved = registry ? resolveDiagramId(registry, elementId) : undefined;
    const element = resolved && registry ? registry.get(resolved) : undefined;
    if (!element) return false;
    canvas.scrollToElement(element);
    return true;
  }

  /**
   * Select *and* center an element — the common "jump to this element" path.
   * Returns `true` if the selection succeeded (centering is best-effort and
   * does not affect the result).
   */
  focusElement(elementId: string): boolean {
    const selected = this.selectElement(elementId);
    this.centerElement(elementId);
    return selected;
  }

  /**
   * Subscribe to canvas selection changes. `cb` receives the id of the first
   * selected element, or `null` when the selection is cleared. Returns an
   * unsubscribe function. No-ops (returns a no-op unsubscribe) when `eventBus`
   * is unavailable.
   */
  onCanvasSelect(cb: (elementId: string | null) => void): () => void {
    const eventBus = this.service<EventBusService>("eventBus");
    if (!eventBus) return () => {};
    const handler = (event: unknown): void => {
      const newSelection = (event as SelectionChangedEvent | undefined)?.newSelection;
      cb(newSelection?.[0]?.id ?? null);
    };
    eventBus.on("selection.changed", handler);
    return () => eventBus.off("selection.changed", handler);
  }
}
