// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * A lightweight in-memory diagram-js host that implements the three services
 * the binding uses (`overlays`, `canvas`, `elementRegistry`) with real
 * bookkeeping. Lets the binding be unit-tested deterministically without a DOM
 * or a real bpmn-js render pass; the separate harness test exercises the real
 * bpmn-js wiring.
 */

import type {
  CanvasService,
  DiagramElement,
  DiagramServices,
  ElementRegistryService,
  OverlayAttrs,
  OverlaysService,
} from "../src/bpmn-js.js";

export interface RecordedOverlay {
  id: string;
  element: string;
  type: string;
  attrs: OverlayAttrs;
}

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

  markersFor(id: string): string[] {
    return [...(this.markers.get(id) ?? [])];
  }
}
