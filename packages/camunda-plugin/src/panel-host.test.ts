// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { axisYMarkerClass } from "@francav/bpmn-js-adapter";
import { DpgPanelHost } from "./panel-host.js";
import { FakeDiagram, GATEWAY_ID, SAMPLE_ANALYSIS, TASK_ID } from "../test/fixtures.js";

const STYLE_ID = "dpg-governance-panels-style";

function mountFresh() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const diagram = new FakeDiagram([TASK_ID, GATEWAY_ID]);
  const host = new DpgPanelHost(container, diagram);
  return { container, diagram, host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("DpgPanelHost", () => {
  it("delegates to the shared helper and mounts the consolidated inspector", () => {
    const { container, host } = mountFresh();
    const mounted = host.mount(SAMPLE_ANALYSIS);

    // Same consolidated inspector as the modeler path — and the profile/policy
    // selector now returns inside it, seeded with the Camunda defaults.
    const inspector = container.querySelector("dpg-governance-inspector");
    expect(inspector).toBeTruthy();
    expect(mounted.panels.layout).toBe("inspector");
    expect(inspector?.shadowRoot?.querySelector("dpg-governance-matrix")).toBeNull(); // collapsed
    expect(inspector?.shadowRoot?.querySelector("dpg-findings-panel")).toBeTruthy();
    // The Camunda-default profile/policy selector is seeded inside the inspector.
    const selector = inspector?.shadowRoot?.querySelector("dpg-profile-policy-selector");
    expect(selector).toBeTruthy();
    expect(selector?.shadowRoot?.textContent).toContain("Camunda 7");
    // The helper handle is exposed on the mounted result.
    expect(mounted.panels.container).toBe(container);
  });

  it("feeds the analysis result into the inspector", () => {
    const { container, host } = mountFresh();
    host.mount(SAMPLE_ANALYSIS);
    const inspector = container.querySelector("dpg-governance-inspector") as HTMLElement & {
      result?: unknown;
    };
    expect(inspector.result).toBe(SAMPLE_ANALYSIS);
  });

  it("paints determinism markers onto the canvas via the adapter", () => {
    const { diagram, host } = mountFresh();
    host.mount(SAMPLE_ANALYSIS);
    expect(diagram.markers.get(TASK_ID)?.has(axisYMarkerClass("runtimeBound"))).toBe(true);
    expect(diagram.markers.get(GATEWAY_ID)?.has(axisYMarkerClass("fullyDeterministic"))).toBe(true);
    expect(diagram.overlaysList.length).toBeGreaterThan(0);
  });

  it("injects the adapter stylesheet (via the helper) exactly once", () => {
    const { host } = mountFresh();
    host.mount(SAMPLE_ANALYSIS);
    expect(document.querySelectorAll(`#${STYLE_ID}`).length).toBe(1);
  });

  it("destroy() detaches panels, decorations and the stylesheet", () => {
    const { container, diagram, host } = mountFresh();
    const mounted = host.mount(SAMPLE_ANALYSIS);
    mounted.destroy();

    expect(container.children.length).toBe(0);
    expect(diagram.overlaysList.length).toBe(0);
    expect(diagram.markers.get(TASK_ID)?.has(axisYMarkerClass("runtimeBound"))).toBe(false);
    expect(document.getElementById(STYLE_ID)).toBeNull();
  });

  it("update() re-paints with a new result", () => {
    const { diagram, host } = mountFresh();
    const mounted = host.mount(SAMPLE_ANALYSIS);

    const flipped = {
      ...SAMPLE_ANALYSIS,
      determinismMap: {
        [TASK_ID]: {
          axisY: "fullyDeterministic" as const,
          axisX: "selfContained" as const,
          rationale: "Now deterministic.",
        },
      },
      findings: [],
    };
    mounted.update(flipped);

    expect(diagram.markers.get(TASK_ID)?.has(axisYMarkerClass("fullyDeterministic"))).toBe(true);
    expect(diagram.markers.get(TASK_ID)?.has(axisYMarkerClass("runtimeBound"))).toBe(false);
  });

  it("focuses the canvas when the inspector re-dispatches dpg-element-select", () => {
    const { container, diagram, host } = mountFresh();
    host.mount(SAMPLE_ANALYSIS);

    // The inspector re-dispatches the bubbling, composed event upward; the
    // delegated listener routes it into DpgCanvasSelection.focusElement.
    const inspector = container.querySelector("dpg-governance-inspector")!;
    inspector.dispatchEvent(
      new CustomEvent("dpg-element-select", {
        detail: { elementId: GATEWAY_ID },
        bubbles: true,
        composed: true,
      }),
    );
    expect(diagram.selected).toContain(GATEWAY_ID);
    expect(diagram.markers.get(GATEWAY_ID)?.has(axisYMarkerClass("fullyDeterministic"))).toBe(true);
  });

  it("canvas→panel: selecting a shape on the canvas drills the inspector in", () => {
    const { container, diagram, host } = mountFresh();
    host.mount(SAMPLE_ANALYSIS);

    const inspector = container.querySelector("dpg-governance-inspector") as HTMLElement & {
      selectedElementId: string | null;
    };
    expect(inspector.selectedElementId).toBeNull();

    diagram.emitCanvasSelect(TASK_ID);
    expect(inspector.selectedElementId).toBe(TASK_ID);
    expect(inspector.shadowRoot?.querySelector("dpg-element-provenance")).toBeTruthy();

    diagram.emitCanvasSelect(null);
    expect(inspector.selectedElementId).toBeNull();
  });
});
