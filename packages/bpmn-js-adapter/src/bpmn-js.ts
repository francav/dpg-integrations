// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Minimal, version-tolerant structural typings for the slice of the bpmn-js /
 * diagram-js service API the canvas binding touches.
 *
 * The binding deliberately does NOT import from `bpmn-js` directly: bpmn-js
 * ships only partial, version-specific typings and renames internals across
 * majors. By describing the public services we use as structural interfaces and
 * resolving them through {@link DiagramServices.get}, the adapter stays green
 * against any bpmn-js (or bare diagram-js) version that keeps these long-stable
 * service contracts — `overlays`, `canvas`, and `elementRegistry`.
 */

/** A diagram-js shape/connection as seen through the registry. Structural. */
export interface DiagramElement {
  id: string;
  type?: string;
  width?: number;
  height?: number;
  businessObject?: { id?: string; name?: string; $type?: string } | undefined;
}

/** The `elementRegistry` service: id ↔ element lookup. */
export interface ElementRegistryService {
  get(id: string): DiagramElement | undefined;
  getAll(): DiagramElement[];
}

/** Position of an HTML overlay relative to an element's bounding box. */
export interface OverlayPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface OverlayAttrs {
  position: OverlayPosition;
  html: string | HTMLElement;
  show?: { minZoom?: number; maxZoom?: number };
  scale?: boolean | { min?: number; max?: number };
}

/** The `overlays` service: attach/detach HTML decorations over elements. */
export interface OverlaysService {
  add(elementId: string, type: string, attrs: OverlayAttrs): string;
  remove(filter: { id?: string; element?: string; type?: string }): void;
}

/**
 * The `canvas` service: CSS marker classes on elements, plus optional viewport
 * navigation. `addMarker`/`removeMarker`/`hasMarker` are long-stable on every
 * diagram-js; the navigation methods (`scrollToElement`, `zoom`, `viewbox`) are
 * present on bpmn-js but are typed optional here so a bare/older diagram-js host
 * (or a fake) still satisfies the contract.
 */
export interface CanvasService {
  addMarker(element: string | DiagramElement, marker: string): void;
  removeMarker(element: string | DiagramElement, marker: string): void;
  hasMarker(element: string | DiagramElement, marker: string): boolean;
  /** Scroll/pan the viewport so the element is in view. diagram-js ≥ 7. */
  scrollToElement?(element: string | DiagramElement, padding?: number): void;
  zoom?(newScale?: number | string, center?: unknown): number;
  viewbox?(box?: unknown): unknown;
}

/**
 * The `selection` service (diagram-js): read and set the canvas selection.
 * `select(null)` clears the selection. Tolerant: a bare host may omit it, so
 * {@link DpgCanvasSelection} resolves it lazily and no-ops when absent.
 */
export interface SelectionService {
  select(element: DiagramElement | string | null): void;
  get(): DiagramElement[];
}

/**
 * The `eventBus` service (diagram-js), minimal read surface: subscribe and
 * unsubscribe to canvas events such as `selection.changed`.
 */
export interface EventBusService {
  on(event: string, callback: (event: unknown) => void): void;
  off(event: string, callback: (event: unknown) => void): void;
}

/**
 * The narrow contract the binding needs from a bpmn-js instance: a service
 * locator. `BpmnModeler`, `BpmnViewer`, `NavigatedViewer`, and a bare
 * diagram-js `Diagram` all satisfy this.
 *
 * `selection` and `eventBus` are resolved tolerantly by
 * {@link DpgCanvasSelection} (a bare host may not register them), so they are
 * declared as overloads but never assumed present.
 */
export interface DiagramServices {
  get<T = unknown>(name: string): T;
  get(name: "overlays"): OverlaysService;
  get(name: "canvas"): CanvasService;
  get(name: "elementRegistry"): ElementRegistryService;
  get(name: "selection"): SelectionService;
  get(name: "eventBus"): EventBusService;
}
