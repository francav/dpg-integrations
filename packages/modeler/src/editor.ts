// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Minimal, version-tolerant structural typings for the slice of the bpmn-js /
 * diagram-js *editor* API the reference modeler drives.
 *
 * The reference modeler is the editing counterpart to `@francav/bpmn-js-adapter`:
 * the adapter only reads a diagram (overlays + markers), whereas the modeler
 * lets a user *edit* a process and re-classifies it on every change. It needs
 * three things beyond the adapter's read-only services:
 *  - the diagram-js `eventBus`, to learn when the model changed, and
 *  - an XML exporter (`saveXML`), to feed the current model to the classifier.
 *
 * As with the adapter, nothing here imports `bpmn-js` directly: a `BpmnModeler`
 * instance (and any diagram-js editor exposing these long-stable contracts)
 * satisfies {@link EditorServices} structurally, so the modeler stays tolerant
 * of the bpmn-js version.
 */

import type {
  CanvasService,
  DiagramServices,
  ElementRegistryService,
  OverlaysService,
} from "@francav/bpmn-js-adapter";

/** A diagram-js event payload. Structural — only the bits we read. */
export interface DiagramEvent {
  [key: string]: unknown;
}

/** Unsubscribe handle returned by {@link EventBusService.on}. */
export type Unsubscribe = () => void;

/**
 * The diagram-js `eventBus` service: subscribe to model-change events. bpmn-js
 * emits `commandStack.changed` (and the higher-level `elements.changed`) on
 * every edit; we treat any of a configurable set as "the model changed".
 */
export interface EventBusService {
  on(event: string, callback: (event: DiagramEvent) => void): void;
  on(events: string[], callback: (event: DiagramEvent) => void): void;
  off(event: string, callback: (event: DiagramEvent) => void): void;
  off(events: string[], callback: (event: DiagramEvent) => void): void;
}

/** Result of {@link XmlExporter.saveXML}. bpmn-js returns `{ xml }`. */
export interface SaveXmlResult {
  xml?: string;
}

/**
 * A bpmn-js editor's `saveXML` method: serialize the current model to BPMN 2.0
 * XML. Lives on the instance itself (not the service registry) on a real
 * `BpmnModeler`, so it is modeled as a separate capability the editor host
 * exposes alongside the service locator.
 */
export interface XmlExporter {
  saveXML(options?: { format?: boolean }): Promise<SaveXmlResult>;
}

/**
 * The narrow contract the reference modeler needs from a bpmn-js editor: the
 * adapter's read-only service locator, *plus* `saveXML`. A `BpmnModeler`
 * satisfies this (it `get`s services, exposes `saveXML`, and registers an
 * `eventBus`). Viewers do not (no `saveXML`), which is correct: the reference
 * modeler is for editing.
 */
export interface EditorServices extends DiagramServices, XmlExporter {
  // Re-declaring `get` replaces the inherited overload set, so the adapter's
  // service overloads are restated here alongside the editor's `eventBus`.
  get<T = unknown>(name: string): T;
  get(name: "overlays"): OverlaysService;
  get(name: "canvas"): CanvasService;
  get(name: "elementRegistry"): ElementRegistryService;
  get(name: "eventBus"): EventBusService;
}
