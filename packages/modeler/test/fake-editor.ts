// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * A lightweight in-memory diagram-js *editor* for testing the reference
 * modeler's edit→classify loop without a real bpmn-js render pass.
 *
 * Beyond the read-only services the canvas adapter needs (`overlays`, `canvas`,
 * `elementRegistry`), it implements the editor extras the modeler drives:
 *  - an `eventBus` (so the modeler can subscribe to change events), and
 *  - `saveXML` (so the modeler can export the current model to classify).
 *
 * `edit(xml, ids)` mutates the model and fires a change event, simulating a user
 * editing the diagram. The separate harness test exercises a real
 * `BpmnModeler`.
 */

import type {
  DiagramEvent,
  EditorServices,
  EventBusService,
  SaveXmlResult,
} from "../src/editor.js";

interface RecordedOverlay {
  id: string;
  element: string;
  type: string;
}

export class FakeEditor implements EditorServices {
  readonly overlaysList: RecordedOverlay[] = [];
  readonly markers = new Map<string, Set<string>>();
  private seq = 0;
  private xml: string;
  private ids: Set<string>;
  private readonly listeners = new Map<string, Set<(event: DiagramEvent) => void>>();

  constructor(xml: string, ids: readonly string[]) {
    this.xml = xml;
    this.ids = new Set(ids);
  }

  /** Simulate a user edit: swap in new XML + element ids and fire a change. */
  edit(xml: string, ids: readonly string[], event = "commandStack.changed"): void {
    this.xml = xml;
    this.ids = new Set(ids);
    this.emit(event);
  }

  private emit(event: string): void {
    for (const cb of this.listeners.get(event) ?? []) cb({});
  }

  private readonly eventBus: EventBusService = {
    on: (events: string | string[], cb: (event: DiagramEvent) => void): void => {
      for (const ev of toArray(events)) {
        const set = this.listeners.get(ev) ?? new Set();
        set.add(cb);
        this.listeners.set(ev, set);
      }
    },
    off: (events: string | string[], cb: (event: DiagramEvent) => void): void => {
      for (const ev of toArray(events)) this.listeners.get(ev)?.delete(cb);
    },
  };

  async saveXML(): Promise<SaveXmlResult> {
    return { xml: this.xml };
  }

  get<T = unknown>(name: string): T {
    switch (name) {
      case "eventBus":
        return this.eventBus as T;
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
        throw new Error(`FakeEditor: unknown service "${name}"`);
    }
  }

  markersFor(id: string): string[] {
    return [...(this.markers.get(id) ?? [])];
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

function toArray(events: string | string[]): string[] {
  return Array.isArray(events) ? events : [events];
}
