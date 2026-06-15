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

/** The `canvas` service: CSS marker classes on elements. */
export interface CanvasService {
  addMarker(element: string | DiagramElement, marker: string): void;
  removeMarker(element: string | DiagramElement, marker: string): void;
  hasMarker(element: string | DiagramElement, marker: string): boolean;
}

/**
 * The narrow contract the binding needs from a bpmn-js instance: a service
 * locator. `BpmnModeler`, `BpmnViewer`, `NavigatedViewer`, and a bare
 * diagram-js `Diagram` all satisfy this.
 */
export interface DiagramServices {
  get<T = unknown>(name: string): T;
  get(name: "overlays"): OverlaysService;
  get(name: "canvas"): CanvasService;
  get(name: "elementRegistry"): ElementRegistryService;
}
