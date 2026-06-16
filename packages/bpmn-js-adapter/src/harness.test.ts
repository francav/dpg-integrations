// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Done-criterion harness: overlay a sample BPMN inside a *real* bpmn-js viewer.
 *
 * Runs a real `NavigatedViewer` headlessly (jsdom + a minimal SVG geometry
 * polyfill — see {@link ../test/svg-jsdom-polyfill}), imports {@link SAMPLE_BPMN},
 * binds {@link SAMPLE_ANALYSIS}, and asserts the decorations land on the real
 * canvas (CSS markers via the `canvas` service, HTML overlays in the DOM).
 */

// @vitest-environment jsdom
import "../test/svg-jsdom-polyfill.js";

import { beforeAll, afterEach, describe, expect, it } from "vitest";
import { DpgCanvasBinding, axisYMarkerClass } from "./index.js";
import { SAMPLE_ANALYSIS, SAMPLE_BPMN, SAMPLE_ELEMENT_IDS } from "../test/fixtures.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ViewerCtor {
  new (opts: { container: HTMLElement }): any;
}

let Viewer: ViewerCtor;

beforeAll(async () => {
  const mod: any = await import("bpmn-js/lib/NavigatedViewer.js");
  Viewer = (mod.default ?? mod) as ViewerCtor;
});

async function mountViewer(): Promise<{ viewer: any; container: HTMLElement }> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const viewer = new Viewer({ container });
  await viewer.importXML(SAMPLE_BPMN);
  return { viewer, container };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("bpmn-js harness", () => {
  it("imports the sample diagram into a real bpmn-js viewer", async () => {
    const { viewer } = await mountViewer();
    const registry: any = viewer.get("elementRegistry");
    expect(registry.get(SAMPLE_ELEMENT_IDS.task)).toBeTruthy();
    expect(registry.get(SAMPLE_ELEMENT_IDS.gateway)).toBeTruthy();
  });

  it("paints determinism markers on the real canvas", async () => {
    const { viewer } = await mountViewer();
    new DpgCanvasBinding(viewer).apply(SAMPLE_ANALYSIS);

    const canvas: any = viewer.get("canvas");
    expect(canvas.hasMarker(SAMPLE_ELEMENT_IDS.task, axisYMarkerClass("runtimeBound"))).toBe(true);
    expect(
      canvas.hasMarker(SAMPLE_ELEMENT_IDS.gateway, axisYMarkerClass("fullyDeterministic")),
    ).toBe(true);
  });

  it("renders coupling + finding overlays as real DOM nodes", async () => {
    const { viewer, container } = await mountViewer();
    new DpgCanvasBinding(viewer).apply(SAMPLE_ANALYSIS);

    // task = externalCoupled (badge) + a warning finding marker → 2 overlays.
    expect(container.querySelectorAll(".dpg-axis-x-badge").length).toBe(1);
    expect(container.querySelectorAll(".dpg-finding-marker").length).toBe(1);
    expect(
      container.querySelector(".dpg-finding-marker")?.classList.contains("dpg-finding-warning"),
    ).toBe(true);
  });

  it("clear() removes every decoration from the real canvas", async () => {
    const { viewer, container } = await mountViewer();
    const binding = new DpgCanvasBinding(viewer);
    binding.apply(SAMPLE_ANALYSIS);
    binding.clear();

    const canvas: any = viewer.get("canvas");
    expect(canvas.hasMarker(SAMPLE_ELEMENT_IDS.task, axisYMarkerClass("runtimeBound"))).toBe(false);
    expect(container.querySelectorAll(".djs-overlay").length).toBe(0);
  });
});
