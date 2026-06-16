// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { axisYMarkerClass } from "@francav/bpmn-js-adapter";
import { FLAT_PANEL_TAGS } from "@francav/components";
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
  it("delegates to the shared helper and mounts the flat panel set", () => {
    const { container, host } = mountFresh();
    const mounted = host.mount(SAMPLE_ANALYSIS);

    // Same flat set as the modeler path (badge + matrix + findings) — and no
    // standalone selector (it returns inside the inspector in F.3c).
    for (const tag of FLAT_PANEL_TAGS) {
      expect(container.querySelector(tag)).toBeTruthy();
    }
    expect(container.querySelector("dpg-profile-policy-selector")).toBeNull();
    // The helper handle is exposed on the mounted result.
    expect(mounted.panels.container).toBe(container);
  });

  it("feeds the analysis result into the rendered panels", () => {
    const { container, host } = mountFresh();
    host.mount(SAMPLE_ANALYSIS);
    const matrix = container.querySelector("dpg-governance-matrix") as HTMLElement & {
      result?: unknown;
    };
    expect(matrix.result).toBe(SAMPLE_ANALYSIS);
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

  it("focuses the canvas when a panel dispatches dpg-element-select", () => {
    const { container, diagram, host } = mountFresh();
    host.mount(SAMPLE_ANALYSIS);

    // The FakeDiagram has no selection service; the delegated listener must
    // route the event into DpgCanvasSelection.focusElement without throwing.
    const matrix = container.querySelector("dpg-governance-matrix")!;
    expect(() =>
      matrix.dispatchEvent(
        new CustomEvent("dpg-element-select", {
          detail: { elementId: GATEWAY_ID },
          bubbles: true,
          composed: true,
        }),
      ),
    ).not.toThrow();
    // Selection is tolerant: no selection service → no-op, canvas untouched.
    expect(diagram.markers.get(GATEWAY_ID)?.has(axisYMarkerClass("fullyDeterministic"))).toBe(true);
  });
});
