// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { axisYMarkerClass } from "@dpg/bpmn-js-adapter";
import { DpgPanelHost, PANEL_TAGS } from "./panel-host.js";
import { DEFAULT_POLICY_ID, DEFAULT_PROFILE_ID, PLUGIN_ID } from "./manifest.js";
import { FakeDiagram, GATEWAY_ID, SAMPLE_ANALYSIS, TASK_ID } from "../test/fixtures.js";

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
  it("mounts every L3 panel into the container", () => {
    const { container, host } = mountFresh();
    const mounted = host.mount(SAMPLE_ANALYSIS);

    for (const tag of PANEL_TAGS) {
      expect(container.querySelector(tag)).toBeTruthy();
      expect(mounted.elements[tag]).toBeInstanceOf(HTMLElement);
    }
  });

  it("feeds the analysis result into the rendered panels", () => {
    const { host } = mountFresh();
    const mounted = host.mount(SAMPLE_ANALYSIS);
    const matrix = mounted.elements["dpg-governance-matrix"] as HTMLElement & {
      result?: unknown;
    };
    expect(matrix.result).toBe(SAMPLE_ANALYSIS);
  });

  it("defaults the selector to the Camunda profile and tier-2 policy", () => {
    const { host } = mountFresh();
    const mounted = host.mount(SAMPLE_ANALYSIS);
    const selector = mounted.elements["dpg-profile-policy-selector"] as HTMLElement & {
      selectedProfile?: string | null;
      selectedPolicy?: string | null;
    };
    expect(selector.selectedProfile).toBe(DEFAULT_PROFILE_ID);
    expect(selector.selectedPolicy).toBe(DEFAULT_POLICY_ID);
  });

  it("honors an explicit profile/policy override", () => {
    const { host } = mountFresh();
    const mounted = host.mount(SAMPLE_ANALYSIS, {
      selectedProfile: "camunda-8",
      selectedPolicy: "baseline-tier-1",
    });
    const selector = mounted.elements["dpg-profile-policy-selector"] as HTMLElement & {
      selectedProfile?: string | null;
      selectedPolicy?: string | null;
    };
    expect(selector.selectedProfile).toBe("camunda-8");
    expect(selector.selectedPolicy).toBe("baseline-tier-1");
  });

  it("paints determinism markers onto the canvas via the adapter", () => {
    const { diagram, host } = mountFresh();
    host.mount(SAMPLE_ANALYSIS);
    expect(diagram.markers.get(TASK_ID)?.has(axisYMarkerClass("runtimeBound"))).toBe(true);
    expect(diagram.markers.get(GATEWAY_ID)?.has(axisYMarkerClass("fullyDeterministic"))).toBe(true);
    expect(diagram.overlaysList.length).toBeGreaterThan(0);
  });

  it("injects the adapter stylesheet exactly once", () => {
    const { host } = mountFresh();
    host.mount(SAMPLE_ANALYSIS);
    expect(document.querySelectorAll(`#${PLUGIN_ID}-style`).length).toBe(1);
  });

  it("destroy() detaches panels, decorations and the stylesheet", () => {
    const { container, diagram, host } = mountFresh();
    const mounted = host.mount(SAMPLE_ANALYSIS);
    mounted.destroy();

    expect(container.children.length).toBe(0);
    expect(diagram.overlaysList.length).toBe(0);
    expect(diagram.markers.get(TASK_ID)?.has(axisYMarkerClass("runtimeBound"))).toBe(false);
    expect(document.getElementById(`${PLUGIN_ID}-style`)).toBeNull();
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
});
