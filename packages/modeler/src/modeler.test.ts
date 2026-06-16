// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Unit test for the governance-only reference modeler's edit→classify loop.
 *
 * Runs under jsdom against an in-memory editor (the harness test exercises a
 * real `BpmnModeler`) and the bundled dependency-free sample classifier — so it
 * proves "edit + classify a process, no external deps" end to end: mount the
 * panels, classify the initial model, then *edit* the model and assert the
 * panels + canvas re-classify.
 */

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { axisYMarkerClass } from "@francav/bpmn-js-adapter";
import type { AnalysisResult } from "@francav/components";
import { startReferenceModeler } from "./modeler.js";
import { SAMPLE_BPMN, sampleClassifier } from "./sample.js";
import { FakeEditor } from "../test/fake-editor.js";

const SAMPLE_IDS = ["StartEvent_1", "Task_Score", "Gateway_Decide", "End_Approved", "End_Rejected"];

/** Same shape as SAMPLE_BPMN but with the external service task removed. */
const EDITED_BPMN = SAMPLE_BPMN.replace(
  /<bpmn:serviceTask id="Task_Score"[\s\S]*?<\/bpmn:serviceTask>/,
  "",
);
const EDITED_IDS = SAMPLE_IDS.filter((id) => id !== "Task_Score");

function mountFresh() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const editor = new FakeEditor(SAMPLE_BPMN, SAMPLE_IDS);
  return { container, editor };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("DpgReferenceModeler", () => {
  it("mounts the governance panels and classifies the initial model", async () => {
    const { container, editor } = mountFresh();
    const session = startReferenceModeler(editor, container, sampleClassifier, { debounceMs: 0 });
    await session.reclassify();

    // The session mounts the consolidated inspector via the helper (default layout).
    const inspector = container.querySelector("dpg-governance-inspector") as HTMLElement & {
      result?: AnalysisResult;
    };
    expect(inspector).toBeTruthy();
    expect(session.panels.layout).toBe("inspector");
    // The helper's handle is exposed on the session.
    expect(session.panels.container).toBe(container);
    expect(session.result).not.toBeNull();
    expect(session.result!.process.id).toBe("Process_LoanDecision");

    // The external service task classified runtime-bound; the gateway deterministic.
    const matrix = session.result!.matrix;
    expect(matrix.axisY.runtimeBound).toBe(1);
    expect(matrix.axisY.fullyDeterministic).toBe(1);

    // The view-model is fed into the inspector, which composes the embedded panels.
    expect(inspector.result).toBe(session.result);
    expect(inspector.shadowRoot?.querySelector("dpg-determinism-badge")).toBeTruthy();

    session.destroy();
  });

  it("paints the canvas overlays/markers via the adapter", async () => {
    const { container, editor } = mountFresh();
    const session = startReferenceModeler(editor, container, sampleClassifier, { debounceMs: 0 });
    await session.reclassify();

    expect(editor.markersFor("Task_Score")).toContain(axisYMarkerClass("runtimeBound"));
    expect(editor.markersFor("Gateway_Decide")).toContain(axisYMarkerClass("fullyDeterministic"));
    // The external task drew an Axis-X badge + a missing-contract finding overlay.
    expect(editor.overlaysList.length).toBeGreaterThan(0);

    session.destroy();
  });

  it("re-classifies and re-paints when the process is edited", async () => {
    const { container, editor } = mountFresh();
    const classified: AnalysisResult[] = [];
    const session = startReferenceModeler(editor, container, sampleClassifier, {
      debounceMs: 0,
      onClassified: (r) => classified.push(r),
    });
    await session.reclassify();
    expect(session.result!.matrix.axisY.runtimeBound).toBe(1);

    // Edit: remove the external service task → it should disappear from the model.
    editor.edit(EDITED_BPMN, EDITED_IDS);
    await session.reclassify();

    expect(session.result!.matrix.axisY.runtimeBound).toBe(0);
    expect(session.result!.matrix.axisY.fullyDeterministic).toBe(1);
    // The surviving gateway is still painted on the canvas after re-applying.
    expect(editor.markersFor("Gateway_Decide")).toContain(axisYMarkerClass("fullyDeterministic"));
    // The findings panel reflects the removed missing-contract warning.
    expect(session.result!.findings.length).toBe(0);
    expect(classified.length).toBeGreaterThanOrEqual(2);

    session.destroy();
  });

  it("focuses the canvas when a panel dispatches dpg-element-select", async () => {
    const { container, editor } = mountFresh();
    const session = startReferenceModeler(editor, container, sampleClassifier, { debounceMs: 0 });
    await session.reclassify();

    // Simulate the inspector re-dispatching its bubbling, composed event upward.
    const inspector = container.querySelector("dpg-governance-inspector")!;
    inspector.dispatchEvent(
      new CustomEvent("dpg-element-select", {
        detail: { elementId: "Gateway_Decide" },
        bubbles: true,
        composed: true,
      }),
    );

    expect(editor.selected).toContain("Gateway_Decide");
    expect(editor.scrolledTo).toContain("Gateway_Decide");

    // After destroy, the delegated listener is gone — no further focus.
    session.destroy();
    container.dispatchEvent(
      new CustomEvent("dpg-element-select", {
        detail: { elementId: "StartEvent_1" },
        bubbles: true,
        composed: true,
      }),
    );
    expect(editor.selected).not.toContain("StartEvent_1");
  });

  it("subscribes on start and unsubscribes on destroy", () => {
    const { container, editor } = mountFresh();
    const session = startReferenceModeler(editor, container, sampleClassifier, { debounceMs: 0 });
    expect(editor.listenerCount("commandStack.changed")).toBe(1);

    session.destroy();
    expect(editor.listenerCount("commandStack.changed")).toBe(0);
    // Inspector and stylesheet (owned by the helper) are torn down.
    expect(container.querySelector("dpg-governance-inspector")).toBeNull();
    expect(document.getElementById("dpg-governance-panels-style")).toBeNull();
  });

  it("canvas→panel: selecting a shape on the canvas drills the inspector in", async () => {
    const { container, editor } = mountFresh();
    const session = startReferenceModeler(editor, container, sampleClassifier, { debounceMs: 0 });
    await session.reclassify();

    const inspector = container.querySelector("dpg-governance-inspector") as HTMLElement & {
      selectedElementId: string | null;
    };
    expect(inspector.selectedElementId).toBeNull();

    // A canvas selection drives the inspector into element drill-down.
    editor.emitCanvasSelect("Gateway_Decide");
    expect(inspector.selectedElementId).toBe("Gateway_Decide");
    expect(inspector.shadowRoot?.querySelector("dpg-element-provenance")).toBeTruthy();

    // Clearing the canvas selection returns the inspector to the overview.
    editor.emitCanvasSelect(null);
    expect(inspector.selectedElementId).toBeNull();

    session.destroy();
  });

  it("reports classification errors instead of throwing", async () => {
    const { container, editor } = mountFresh();
    const errors: unknown[] = [];
    const failing = (): never => {
      throw new Error("boom");
    };
    const session = startReferenceModeler(editor, container, failing, {
      debounceMs: 0,
      onError: (e) => errors.push(e),
    });
    await session.reclassify();

    // The initial classification on start plus this reclassify both failed, but
    // neither threw out of the loop — they were routed to onError.
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]).toBeInstanceOf(Error);
    expect(session.result).toBeNull();

    session.destroy();
  });
});
