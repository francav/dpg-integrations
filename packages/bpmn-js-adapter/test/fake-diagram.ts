// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * A lightweight in-memory diagram-js host that implements the services the
 * adapter touches (`overlays`, `canvas`, `elementRegistry`, plus the optional
 * `selection` and `eventBus`) with real bookkeeping. Lets the binding and the
 * selection seam be unit-tested deterministically without a DOM or a real
 * bpmn-js render pass; the separate harness test exercises the real bpmn-js
 * wiring.
 *
 * The `withSelection` / `withEventBus` / `withScrollToElement` options omit
 * those capabilities to simulate a bare or older diagram-js host, so the
 * adapter's tolerant no-op paths can be exercised.
 */

import type {
  CanvasService,
  DiagramElement,
  DiagramServices,
  ElementRegistryService,
  EventBusService,
  OverlayAttrs,
  OverlaysService,
  SelectionService,
} from "../src/bpmn-js.js";

export interface RecordedOverlay {
  id: string;
  element: string;
  type: string;
  attrs: OverlayAttrs;
}

export interface FakeDiagramOptions {
  /** Omit the `selection` service (simulate a bare host). Default: present. */
  withSelection?: boolean;
  /** Omit the `eventBus` service (simulate a bare host). Default: present. */
  withEventBus?: boolean;
  /** Omit `canvas.scrollToElement` (simulate older diagram-js). Default: present. */
  withScrollToElement?: boolean;
}

export class FakeDiagram implements DiagramServices {
  readonly overlaysList: RecordedOverlay[] = [];
  readonly markers = new Map<string, Set<string>>();
  /** Elements passed to `selection.select`, in order (null = cleared). */
  readonly selected: (DiagramElement | string | null)[] = [];
  /** Elements passed to `canvas.scrollToElement`, in order. */
  readonly scrolledTo: (DiagramElement | string)[] = [];
  private seq = 0;
  private readonly elements: Map<string, DiagramElement>;
  private readonly opts: Required<FakeDiagramOptions>;
  private currentSelection: DiagramElement[] = [];
  private readonly busListeners = new Map<string, Set<(event: unknown) => void>>();

  constructor(ids: string[], options: FakeDiagramOptions = {}) {
    this.elements = new Map(ids.map((id) => [id, { id }]));
    this.opts = {
      withSelection: options.withSelection ?? true,
      withEventBus: options.withEventBus ?? true,
      withScrollToElement: options.withScrollToElement ?? true,
    };
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

  private get canvas(): CanvasService {
    const canvas: CanvasService = {
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
    if (this.opts.withScrollToElement) {
      canvas.scrollToElement = (element) => {
        this.scrolledTo.push(element);
      };
    }
    return canvas;
  }

  private selection: SelectionService = {
    select: (element) => {
      this.selected.push(element);
      if (element === null) this.currentSelection = [];
      else if (typeof element === "string") {
        const el = this.elements.get(element);
        this.currentSelection = el ? [el] : [];
      } else this.currentSelection = [element];
    },
    get: () => this.currentSelection,
  };

  private bus: EventBusService = {
    on: (event, cb) => {
      const set = this.busListeners.get(event) ?? new Set();
      set.add(cb);
      this.busListeners.set(event, set);
    },
    off: (event, cb) => {
      this.busListeners.get(event)?.delete(cb);
    },
  };

  /** Simulate diagram-js firing `selection.changed` with the given selection. */
  fireSelectionChanged(newSelection: DiagramElement[]): void {
    this.currentSelection = newSelection;
    for (const cb of this.busListeners.get("selection.changed") ?? []) cb({ newSelection });
  }

  busListenerCount(event: string): number {
    return this.busListeners.get(event)?.size ?? 0;
  }

  get<T = unknown>(name: string): T {
    switch (name) {
      case "overlays":
        return this.overlays as unknown as T;
      case "canvas":
        return this.canvas as unknown as T;
      case "elementRegistry":
        return this.registry as unknown as T;
      case "selection":
        if (!this.opts.withSelection) throw new Error(`FakeDiagram: no "selection" service`);
        return this.selection as unknown as T;
      case "eventBus":
        if (!this.opts.withEventBus) throw new Error(`FakeDiagram: no "eventBus" service`);
        return this.bus as unknown as T;
      default:
        throw new Error(`FakeDiagram: unknown service "${name}"`);
    }
  }

  markersFor(id: string): string[] {
    return [...(this.markers.get(id) ?? [])];
  }
}
