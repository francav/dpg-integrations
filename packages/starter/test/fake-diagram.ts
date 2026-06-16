// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * A lightweight in-memory diagram-js host implementing the three services the
 * canvas binding uses (`overlays`, `canvas`, `elementRegistry`). Lets the canvas
 * starter variant be tested deterministically without a real bpmn-js render
 * pass (the adapter package carries the real-bpmn-js harness test).
 */

import type { DiagramServices } from "@dpg/bpmn-js-adapter";

interface RecordedOverlay {
  id: string;
  element: string;
  type: string;
}

export class FakeDiagram implements DiagramServices {
  readonly overlaysList: RecordedOverlay[] = [];
  readonly markers = new Map<string, Set<string>>();
  private seq = 0;
  private readonly ids: Set<string>;

  constructor(ids: readonly string[]) {
    this.ids = new Set(ids);
  }

  get<T = unknown>(name: string): T {
    switch (name) {
      case "overlays":
        return {
          add: (element: string, type: string): string => {
            const id = `overlay-${this.seq++}`;
            this.overlaysList.push({ id, element, type });
            return id;
          },
          remove: (filter: { id?: string; element?: string; type?: string }): void => {
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
        } as T;
      case "canvas":
        return {
          addMarker: (element: string, marker: string): void => {
            const set = this.markers.get(element) ?? new Set<string>();
            set.add(marker);
            this.markers.set(element, set);
          },
          removeMarker: (element: string, marker: string): void => {
            this.markers.get(element)?.delete(marker);
          },
          hasMarker: (element: string, marker: string): boolean =>
            this.markers.get(element)?.has(marker) ?? false,
        } as T;
      case "elementRegistry":
        return {
          get: (id: string): { id: string } | undefined => (this.ids.has(id) ? { id } : undefined),
          getAll: (): { id: string }[] => [...this.ids].map((id) => ({ id })),
        } as T;
      default:
        throw new Error(`FakeDiagram: unknown service "${name}"`);
    }
  }

  markersFor(id: string): string[] {
    return [...(this.markers.get(id) ?? [])];
  }
}
