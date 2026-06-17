// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Entry point for the DPG visual harness.
 *
 * Two independent sections are wired on the page:
 *  - Section A validates `@francav/bpmn-js-adapter` against a read-only
 *    `NavigatedViewer`: compile → map → `DpgCanvasBinding.apply()`, plus
 *    `DpgCanvasSelection` focus buttons and a canvas→panel selection log.
 *  - Section B validates `dpg-modeler` against an editable `Modeler`:
 *    `startReferenceModeler` with the real compiler classifier (live
 *    re-classify on edit, inspector drill-down, profile/policy re-run).
 *
 * bpmn-js + the adapter overlay CSS + component element styles are loaded so the
 * canvas, overlays, and panels all render.
 */

// bpmn-js stylesheets (diagram-js core + bpmn-js shapes/font). Vite bundles these.
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";

import NavigatedViewer from "bpmn-js/lib/NavigatedViewer";
import Modeler from "bpmn-js/lib/Modeler";

import { compileModelInBrowser } from "@francav/compiler-browser";
import { mapCompilerResult } from "@francav/components";
import type { CompilerResultInput, DiagramElementIndex } from "@francav/components";
import {
  DpgCanvasBinding,
  DpgCanvasSelection,
  dpgStylesheet,
  type DiagramServices,
} from "@francav/bpmn-js-adapter";
import {
  startReferenceModeler,
  createCompilerClassifier,
  AVAILABLE_PROFILES,
  AVAILABLE_POLICIES,
  DEFAULT_PROFILE_ID,
  DEFAULT_POLICY_ID,
  type EditorServices,
} from "dpg-modeler";

import { SAMPLE_BPMN, SAMPLE_IDS } from "./sample.js";

/** The adapter owns its overlay CSS; inject it once so rings/badges render. */
document.head.insertAdjacentHTML("beforeend", `<style>${dpgStylesheet()}</style>`);

const MODEL_ID = "Process_LoanReview";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

function reportError(where: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${where}]`, error);
  const banner = document.createElement("div");
  banner.className = "error";
  banner.textContent = `${where}: ${message}`;
  document.body.appendChild(banner);
}

/**
 * Build a DiagramElementIndex from the viewer's registry so the adapter can
 * reconcile compiler evaluation-point ids against the live canvas ids.
 */
function readDiagramIndex(diagram: DiagramServices): DiagramElementIndex | undefined {
  const registry = diagram.get<{ getAll(): { id?: string }[] }>("elementRegistry");
  const elements = registry
    .getAll()
    .filter((e): e is { id: string } => typeof e.id === "string" && e.id.length > 0)
    .map((e) => ({ id: e.id }));
  return elements.length > 0 ? { elements } : undefined;
}

// ---------------------------------------------------------------------------
// Section A — bpmn-js-adapter (read-only canvas decoration)
// ---------------------------------------------------------------------------
async function setupSectionA(): Promise<void> {
  const viewer = new NavigatedViewer({ container: el("canvas-a") });
  await viewer.importXML(SAMPLE_BPMN);

  // The bpmn-js instance satisfies the adapter's structural DiagramServices
  // (it exposes `get(name)` for overlays/canvas/elementRegistry/selection/eventBus).
  const diagram = viewer as unknown as DiagramServices;

  // Compile the sample with the real browser compiler, map to the view-model,
  // then paint it onto the canvas.
  const result = (await compileModelInBrowser({
    modelId: MODEL_ID,
    bpmnXml: SAMPLE_BPMN,
  })) as unknown as CompilerResultInput;
  const mapped = mapCompilerResult(result, readDiagramIndex(diagram));

  const binding = new DpgCanvasBinding(diagram);
  const report = binding.apply(mapped);
  el("status-a").textContent =
    `painted ${report.markersAdded} rings + ${report.overlaysAdded} overlays ` +
    `(matched ${report.matched.length}, unmatched ${report.unmatched.length})`;

  // Selection seam: focus buttons (panel→canvas) + canvas→panel selection log.
  const selection = new DpgCanvasSelection(diagram);
  const log = el("log-a");
  const lines: string[] = [];
  selection.onCanvasSelect((id) => {
    lines.unshift(`onCanvasSelect → ${id ?? "(cleared)"}`);
    log.textContent = lines.slice(0, 8).join("\n");
  });

  el("focus-user").addEventListener("click", () => selection.focusElement(SAMPLE_IDS.userTask));
  el("focus-service").addEventListener("click", () =>
    selection.focusElement(SAMPLE_IDS.serviceTask),
  );
  el("focus-call").addEventListener("click", () => selection.focusElement(SAMPLE_IDS.callActivity));
}

// ---------------------------------------------------------------------------
// Section B — dpg-modeler (live governance modeler)
// ---------------------------------------------------------------------------
async function setupSectionB(): Promise<void> {
  const modeler = new Modeler({ container: el("canvas-b") });
  await modeler.importXML(SAMPLE_BPMN);

  const editor = modeler as unknown as EditorServices;
  startReferenceModeler(editor, el("panels-b"), createCompilerClassifier({ modelId: MODEL_ID }), {
    profiles: [...AVAILABLE_PROFILES],
    policies: [...AVAILABLE_POLICIES],
    selectedProfile: DEFAULT_PROFILE_ID,
    selectedPolicy: DEFAULT_POLICY_ID,
    onError: (error) => reportError("Section B re-classify", error),
  });
}

setupSectionA().catch((error) => reportError("Section A", error));
setupSectionB().catch((error) => reportError("Section B", error));
