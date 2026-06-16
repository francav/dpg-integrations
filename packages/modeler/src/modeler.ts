// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * {@link DpgReferenceModeler} — a governance-only reference modeler.
 *
 * This is the editing counterpart to the read-only integrations in this repo.
 * Given a bpmn-js editor ({@link EditorServices}), a panel container, and an
 * injectable {@link Classifier}, it lets a user *edit* a process and keeps the
 * governance view live:
 *  - it mounts the L3 governance panels (determinism badge, matrix, findings)
 *    beside the canvas via `@dpg/components`,
 *  - it subscribes to the editor's change events, and on each edit it exports
 *    the current XML, classifies it, maps the result onto the
 *    {@link AnalysisResult} view-model, and re-paints both the panels and the
 *    canvas overlays/markers via `@dpg/bpmn-js-adapter`.
 *
 * It is deliberately governance-only: no AI assistance, no process execution,
 * no form design — just edit + classify. All governance logic lives upstream
 * (the injected classifier + `@dpg/components`' adapter); this class is the
 * thin edit→classify→render loop that ties them together, built directly on the
 * canvas adapter rather than a bespoke canvas.
 */

import { DpgCanvasBinding, dpgStylesheet } from "@dpg/bpmn-js-adapter";
import { defineDpgElements, mapCompilerResult } from "@dpg/components";
import type { AnalysisResult, DiagramElementIndex } from "@dpg/components";
import type { Classifier } from "./classify.js";
import type { DiagramEvent, EditorServices, EventBusService } from "./editor.js";

/** The governance panel tags the reference modeler mounts, in display order. */
export const MODELER_PANEL_TAGS = [
  "dpg-determinism-badge",
  "dpg-governance-matrix",
  "dpg-findings-panel",
] as const;

export type ModelerPanelTag = (typeof MODELER_PANEL_TAGS)[number];

/**
 * diagram-js editor events that signify the model changed. bpmn-js fires
 * `commandStack.changed` after every und/redoable edit and `elements.changed`
 * on shape/property mutations; either is a reliable "re-classify now" trigger.
 */
export const DEFAULT_CHANGE_EVENTS = ["commandStack.changed", "elements.changed"] as const;

const STYLE_ELEMENT_ID = "dpg-reference-modeler-style";

export interface ReferenceModelerOptions {
  /**
   * Editor events that trigger a re-classify. Defaults to
   * {@link DEFAULT_CHANGE_EVENTS}.
   */
  changeEvents?: readonly string[];
  /**
   * Debounce window (ms) for collapsing bursts of edit events into a single
   * re-classify. Defaults to 150ms. Set to 0 to classify synchronously on every
   * event (used by tests).
   */
  debounceMs?: number;
  /**
   * Document the modeler injects the adapter stylesheet into. Defaults to the
   * panel container's owner document. Pass `null` to skip injection (e.g. when
   * the host already provides the marker CSS).
   */
  styleTarget?: Document | null;
  /** Called after each successful (re)classification, with the new view-model. */
  onClassified?: (result: AnalysisResult) => void;
  /** Called when a classification throws (e.g. invalid XML mid-edit). */
  onError?: (error: unknown) => void;
}

/** A live reference-modeler session: panels, binding, and lifecycle. */
export interface ReferenceModelerSession {
  readonly elements: Record<ModelerPanelTag, HTMLElement>;
  readonly binding: DpgCanvasBinding;
  /** The latest classification, or `null` before the first one completes. */
  readonly result: AnalysisResult | null;
  /** Force a re-classification now (bypasses the debounce). Resolves when done. */
  reclassify(): Promise<void>;
  /** Stop listening for edits, remove decorations and panels, drop the stylesheet. */
  destroy(): void;
}

/**
 * Mount the governance panels for `editor` into `panelContainer` and start the
 * edit→classify→render loop. The session is returned immediately; the first
 * classification runs asynchronously (await {@link ReferenceModelerSession.reclassify}
 * if you need to wait for it).
 */
export class DpgReferenceModeler {
  private readonly editor: EditorServices;
  private readonly container: HTMLElement;
  private readonly classify: Classifier;

  constructor(editor: EditorServices, panelContainer: HTMLElement, classify: Classifier) {
    this.editor = editor;
    this.container = panelContainer;
    this.classify = classify;
  }

  start(options: ReferenceModelerOptions = {}): ReferenceModelerSession {
    const changeEvents = options.changeEvents ?? DEFAULT_CHANGE_EVENTS;
    const debounceMs = options.debounceMs ?? 150;

    defineDpgElements();

    const ownerDoc = this.container.ownerDocument;
    const styleTarget = options.styleTarget === undefined ? ownerDoc : options.styleTarget;
    if (styleTarget) injectStylesheet(styleTarget);

    const elements = this.createElements(ownerDoc);
    const binding = new DpgCanvasBinding(this.editor);

    let latest: AnalysisResult | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let destroyed = false;

    const render = (result: AnalysisResult): void => {
      latest = result;
      for (const tag of MODELER_PANEL_TAGS) {
        (elements[tag] as HTMLElement & { result?: AnalysisResult }).result = result;
      }
      binding.apply(result);
    };

    const runClassification = async (): Promise<void> => {
      if (destroyed) return;
      try {
        const xml = await exportXml(this.editor);
        const compilerResult = await this.classify(xml);
        if (destroyed) return;
        const diagram = readDiagramIndex(this.editor);
        render(mapCompilerResult(compilerResult, diagram));
        options.onClassified?.(latest!);
      } catch (error) {
        if (!destroyed) options.onError?.(error);
      }
    };

    const onChange = (): void => {
      if (debounceMs <= 0) {
        void runClassification();
        return;
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        void runClassification();
      }, debounceMs);
    };

    const eventBus = this.editor.get("eventBus");
    subscribe(eventBus, changeEvents, onChange);

    // Classify the initial model so the panels are never empty.
    void runClassification();

    return {
      elements,
      binding,
      get result(): AnalysisResult | null {
        return latest;
      },
      reclassify: async (): Promise<void> => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
        await runClassification();
      },
      destroy: (): void => {
        destroyed = true;
        if (timer) clearTimeout(timer);
        unsubscribe(eventBus, changeEvents, onChange);
        binding.clear();
        for (const el of Object.values(elements)) el.remove();
        if (styleTarget) styleTarget.getElementById(STYLE_ELEMENT_ID)?.remove();
      },
    };
  }

  private createElements(doc: Document): Record<ModelerPanelTag, HTMLElement> {
    const entries = MODELER_PANEL_TAGS.map((tag): [ModelerPanelTag, HTMLElement] => {
      const el = doc.createElement(tag);
      this.container.appendChild(el);
      return [tag, el];
    });
    return Object.fromEntries(entries) as Record<ModelerPanelTag, HTMLElement>;
  }
}

/** Convenience: construct a modeler and start it in one call. */
export function startReferenceModeler(
  editor: EditorServices,
  panelContainer: HTMLElement,
  classify: Classifier,
  options: ReferenceModelerOptions = {},
): ReferenceModelerSession {
  return new DpgReferenceModeler(editor, panelContainer, classify).start(options);
}

/** Export the editor's current model to BPMN 2.0 XML. */
async function exportXml(editor: EditorServices): Promise<string> {
  const { xml } = await editor.saveXML({ format: true });
  if (typeof xml !== "string" || xml.length === 0) {
    throw new Error("reference modeler: editor returned empty XML");
  }
  return xml;
}

/**
 * Read the diagram's canonical element ids so the adapter can reconcile the
 * compiler's evaluation-point ids against the live canvas. Returns `undefined`
 * if the registry is empty (the adapter then uses the ids verbatim).
 */
function readDiagramIndex(editor: EditorServices): DiagramElementIndex | undefined {
  const registry = editor.get("elementRegistry");
  const elements = registry
    .getAll()
    .filter((el) => typeof el.id === "string" && el.id.length > 0)
    .map((el) => ({ id: el.id }));
  return elements.length > 0 ? { elements } : undefined;
}

function subscribe(
  bus: EventBusService,
  events: readonly string[],
  cb: (event: DiagramEvent) => void,
): void {
  for (const event of events) bus.on(event, cb);
}

function unsubscribe(
  bus: EventBusService,
  events: readonly string[],
  cb: (event: DiagramEvent) => void,
): void {
  for (const event of events) bus.off(event, cb);
}

/** Inject the adapter's Axis-Y ring + decoration stylesheet once per document. */
function injectStylesheet(target: Document): void {
  if (target.getElementById(STYLE_ELEMENT_ID)) return;
  const style = target.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = dpgStylesheet();
  (target.head ?? target.documentElement).appendChild(style);
}
