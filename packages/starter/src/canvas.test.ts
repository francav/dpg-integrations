// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Done-criterion (canvas): the same sample analysis mounts the L3 panels into a
 * container and paints Axis-Y rings / Axis-X badges / finding markers onto a
 * diagram canvas. Runs under jsdom against an in-memory diagram-js host (the
 * adapter package owns the real-bpmn-js harness).
 */

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { mountCanvas } from "./canvas.js";
import { SAMPLE_COMPILER_RESULT, SAMPLE_ELEMENT_IDS } from "./sample.js";
import { FakeDiagram } from "../test/fake-diagram.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("canvas starter", () => {
  it("mounts panels and decorates the canvas from the sample compiler result", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const diagram = new FakeDiagram(SAMPLE_ELEMENT_IDS);

    const mounted = mountCanvas(diagram, container, SAMPLE_COMPILER_RESULT, {
      diagram: { elements: SAMPLE_ELEMENT_IDS.map((id) => ({ id })) },
    });

    // The consolidated inspector is mounted as a single custom element.
    const inspector = container.querySelector("dpg-governance-inspector");
    expect(inspector).toBeTruthy();
    expect(mounted.panels.layout).toBe("inspector");
    // It composes the embedded panels inside its own shadow root.
    expect(inspector?.shadowRoot?.querySelector("dpg-determinism-badge")).toBeTruthy();
    expect(inspector?.shadowRoot?.querySelector("dpg-findings-panel")).toBeTruthy();

    // The adapter painted a determinism marker on the classified service task.
    expect(diagram.markersFor("Task_Score").length).toBeGreaterThan(0);
    // …and added overlays (Axis-X badge / finding markers).
    expect(diagram.overlaysList.length).toBeGreaterThan(0);

    // The stylesheet was injected exactly once.
    expect(document.querySelectorAll("#dpg-governance-panels-style")).toHaveLength(1);

    mounted.destroy();
    expect(container.querySelector("dpg-governance-inspector")).toBeNull();
    expect(diagram.markersFor("Task_Score")).toHaveLength(0);
    expect(document.getElementById("dpg-governance-panels-style")).toBeNull();
  });

  it("canvas→panel: selecting a shape on the canvas drills the inspector in", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const diagram = new FakeDiagram(SAMPLE_ELEMENT_IDS);

    const mounted = mountCanvas(diagram, container, SAMPLE_COMPILER_RESULT, {
      diagram: { elements: SAMPLE_ELEMENT_IDS.map((id) => ({ id })) },
    });
    const inspector = container.querySelector("dpg-governance-inspector") as HTMLElement & {
      selectedElementId: string | null;
    };

    // Overview initially (no element selected).
    expect(inspector.selectedElementId).toBeNull();

    // A canvas selection drives the inspector into element drill-down.
    diagram.emitCanvasSelect("Task_Score");
    expect(inspector.selectedElementId).toBe("Task_Score");
    expect(inspector.shadowRoot?.querySelector("dpg-element-provenance")).toBeTruthy();

    // Clearing the canvas selection returns the inspector to the overview.
    diagram.emitCanvasSelect(null);
    expect(inspector.selectedElementId).toBeNull();

    mounted.destroy();
  });
});
