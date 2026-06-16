// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * {@link DpgReferenceModeler} — a governance-only reference modeler.
 *
 * This is the editing counterpart to the read-only integrations in this repo.
 * Given a bpmn-js editor ({@link EditorServices}), a panel container, and an
 * injectable {@link Classifier}, it lets a user *edit* a process and keeps the
 * governance view live:
 *  - it mounts the consolidated governance inspector beside the canvas via
 *    `@francav/components`' shared {@link mountGovernancePanels} helper (which
 *    owns element registration, the inspector, the one-time stylesheet
 *    injection, and the delegated `dpg-element-select` listener),
 *  - it subscribes to the editor's change events, and on each edit it exports
 *    the current XML, classifies it, maps the result onto the
 *    {@link AnalysisResult} view-model, and re-paints both the panels and the
 *    canvas overlays/markers via `@francav/bpmn-js-adapter`.
 *
 * It is deliberately governance-only: no AI assistance, no process execution,
 * no form design — just edit + classify. All governance logic lives upstream
 * (the injected classifier + `@francav/components`' adapter); this class is the
 * thin edit→classify→render loop that ties them together, built directly on the
 * canvas adapter rather than a bespoke canvas.
 */

import { DpgCanvasBinding, DpgCanvasSelection, dpgStylesheet } from "@francav/bpmn-js-adapter";
import { mapCompilerResult, mountGovernancePanels } from "@francav/components";
import type {
  AnalysisResult,
  DiagramElementIndex,
  GovernancePanelsHandle,
  SelectorOption,
} from "@francav/components";
import type { Classifier } from "./classify.js";
import type { DiagramEvent, EditorServices, EventBusService } from "./editor.js";
import { AVAILABLE_POLICIES, AVAILABLE_PROFILES } from "./packs.js";

/** The pack the selector falls back to when the host seeds no profile. */
export const DEFAULT_PROFILE_ID = "camunda-7";
/** The pack the selector falls back to when the host seeds no policy. */
export const DEFAULT_POLICY_ID = "baseline-tier-1";

/**
 * diagram-js editor events that signify the model changed. bpmn-js fires
 * `commandStack.changed` after every und/redoable edit and `elements.changed`
 * on shape/property mutations; either is a reliable "re-classify now" trigger.
 */
export const DEFAULT_CHANGE_EVENTS = ["commandStack.changed", "elements.changed"] as const;

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
  /** Called after each successful (re)classification, with the new view-model. */
  onClassified?: (result: AnalysisResult) => void;
  /** Called when a classification throws (e.g. invalid XML mid-edit). */
  onError?: (error: unknown) => void;
  /** Runtime-profile options shown in the inspector's profile/policy selector. */
  profiles?: SelectorOption[];
  /** Policy-pack options shown in the inspector's profile/policy selector. */
  policies?: SelectorOption[];
  /** The initially selected runtime profile id. */
  selectedProfile?: string | null;
  /** The initially selected policy id. */
  selectedPolicy?: string | null;
  /** Called when the inspector's profile selector changes. */
  onProfileChange?: (id: string) => void;
  /** Called when the inspector's policy selector changes. */
  onPolicyChange?: (id: string) => void;
}

/** A live reference-modeler session: panels, binding, and lifecycle. */
export interface ReferenceModelerSession {
  /**
   * The shared governance-panels handle. The helper already wires the delegated
   * `dpg-element-select` listener to canvas focus; this is exposed for hosts
   * that want to drive the panels directly (e.g. `update`/`setSelectedElement`).
   */
  readonly panels: GovernancePanelsHandle;
  readonly binding: DpgCanvasBinding;
  /**
   * The canvas selection seam. The helper's `onElementSelect` callback already
   * routes panel selections to {@link DpgCanvasSelection.focusElement}; this is
   * exposed for hosts that want to drive selection programmatically.
   */
  readonly selection: DpgCanvasSelection;
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

    const binding = new DpgCanvasBinding(this.editor);
    const selection = new DpgCanvasSelection(this.editor);

    // Track the active profile/policy pack ids, seeded from the host options and
    // defaulting to the camunda-7 / baseline-tier-1 packs. These flow into every
    // classification so the analysis runs against the selected packs, and the
    // selector's change events update them and re-classify.
    let currentProfileId = options.selectedProfile ?? DEFAULT_PROFILE_ID;
    let currentPolicyId = options.selectedPolicy ?? DEFAULT_POLICY_ID;

    let latest: AnalysisResult | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let destroyed = false;

    const render = (result: AnalysisResult): void => {
      latest = result;
      panels.update(result);
      binding.apply(result);
    };

    const runClassification = async (): Promise<void> => {
      if (destroyed) return;
      try {
        const xml = await exportXml(this.editor);
        const compilerResult = await this.classify(xml, {
          profileId: currentProfileId ?? undefined,
          policyId: currentPolicyId ?? undefined,
        });
        if (destroyed) return;
        const diagram = readDiagramIndex(this.editor);
        render(mapCompilerResult(compilerResult, diagram));
        options.onClassified?.(latest!);
      } catch (error) {
        if (!destroyed) options.onError?.(error);
      }
    };

    // The helper owns element registration, the consolidated inspector, the
    // one-time stylesheet injection, and the single delegated
    // `dpg-element-select` listener. Panel → canvas: focus the named element
    // and drill the inspector into it. The profile/policy options default to the
    // bundled packs and reflect the active selection.
    const panels = mountGovernancePanels(this.container, {
      layout: "inspector",
      stylesheet: dpgStylesheet(),
      profiles: options.profiles ?? [...AVAILABLE_PROFILES],
      policies: options.policies ?? [...AVAILABLE_POLICIES],
      selectedProfile: currentProfileId,
      selectedPolicy: currentPolicyId,
      onElementSelect: (id) => {
        selection.focusElement(id);
        panels.setSelectedElement(id);
      },
      // Selecting a pack updates the tracked id, notifies the host, and re-runs
      // the analysis against the chosen pack.
      onProfileChange: (id) => {
        currentProfileId = id;
        options.onProfileChange?.(id);
        void runClassification();
      },
      onPolicyChange: (id) => {
        currentPolicyId = id;
        options.onPolicyChange?.(id);
        void runClassification();
      },
    });

    // Canvas → panel: clicking a shape on the canvas drills the inspector into
    // that element (or back to the overview when the selection is cleared).
    const unsubscribeCanvasSelect = selection.onCanvasSelect((id) => {
      panels.setSelectedElement(id);
    });

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
      panels,
      binding,
      selection,
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
        unsubscribeCanvasSelect();
        binding.clear();
        panels.destroy();
      },
    };
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
