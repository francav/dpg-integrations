// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Shared test fixtures for the camunda-plugin: a tiny in-memory diagram host
 * (the three diagram-js services the adapter touches) and a sample
 * {@link AnalysisResult} matching its element ids.
 */

import type { AnalysisResult } from "@francav/components";
import type {
  CanvasService,
  DiagramElement,
  DiagramServices,
  ElementRegistryService,
  OverlayAttrs,
  OverlaysService,
} from "@francav/bpmn-js-adapter";

export const TASK_ID = "Task_review";
export const GATEWAY_ID = "Gateway_route";

interface RecordedOverlay {
  id: string;
  element: string;
  type: string;
  attrs: OverlayAttrs;
}

/** A minimal diagram-js host implementing overlays/canvas/elementRegistry. */
export class FakeDiagram implements DiagramServices {
  readonly overlaysList: RecordedOverlay[] = [];
  readonly markers = new Map<string, Set<string>>();
  private seq = 0;
  private readonly elements: Map<string, DiagramElement>;

  constructor(ids: string[]) {
    this.elements = new Map(ids.map((id) => [id, { id }]));
  }

  private registry: ElementRegistryService = {
    get: (id) => this.elements.get(id),
    getAll: () => [...this.elements.values()],
  };

  private overlays: OverlaysService = {
    add: (element, type, attrs) => {
      const id = `overlay-${this.seq++}`;
      this.overlaysList.push({ id, element, type, attrs });
      return id;
    },
    remove: (filter) => {
      for (let i = this.overlaysList.length - 1; i >= 0; i--) {
        const o = this.overlaysList[i]!;
        if (
          (filter.id === undefined || o.id === filter.id) &&
          (filter.element === undefined || o.element === filter.element) &&
          (filter.type === undefined || o.type === filter.type)
        ) {
          this.overlaysList.splice(i, 1);
        }
      }
    },
  };

  private canvas: CanvasService = {
    addMarker: (element, marker) => {
      const id = typeof element === "string" ? element : element.id;
      const set = this.markers.get(id) ?? new Set<string>();
      set.add(marker);
      this.markers.set(id, set);
    },
    removeMarker: (element, marker) => {
      const id = typeof element === "string" ? element : element.id;
      this.markers.get(id)?.delete(marker);
    },
    hasMarker: (element, marker) => {
      const id = typeof element === "string" ? element : element.id;
      return this.markers.get(id)?.has(marker) ?? false;
    },
  };

  get<T = unknown>(name: string): T {
    switch (name) {
      case "overlays":
        return this.overlays as unknown as T;
      case "canvas":
        return this.canvas as unknown as T;
      case "elementRegistry":
        return this.registry as unknown as T;
      default:
        throw new Error(`FakeDiagram: unknown service "${name}"`);
    }
  }
}

export const SAMPLE_ANALYSIS: AnalysisResult = {
  process: { id: "Process_1", name: "Loan review" },
  summary: {
    maturitySignal: "fair",
    score: 62,
    structuralFindings: 1,
    semanticFindings: 0,
    contractCoverageRatio: 0.5,
    degradedFlags: ["runtime-bound"],
  },
  matrix: {
    axisY: { fullyDeterministic: 1, policyDependent: 0, runtimeBound: 1 },
    axisX: { selfContained: 1, profileScoped: 0, engineSpecific: 0, externalCoupled: 1 },
  },
  findings: [
    {
      id: "F1",
      elementId: TASK_ID,
      severity: "warning",
      category: "runtime",
      title: "External service contract undocumented",
      message: "The external task has no documented contract.",
      policyId: "baseline-tier-2",
      recommendation: "Document the service contract.",
    },
  ],
  determinismMap: {
    [TASK_ID]: {
      axisY: "runtimeBound",
      axisX: "externalCoupled",
      rationale: "Outcome depends on an external service.",
    },
    [GATEWAY_ID]: {
      axisY: "fullyDeterministic",
      axisX: "selfContained",
      rationale: "All flows carry exhaustive conditions.",
    },
  },
  runtimeDependencyMap: {},
  recommendations: [],
};
