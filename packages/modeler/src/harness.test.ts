// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Done-criterion harness: edit + classify a process in a *real* bpmn-js editor,
 * with no external dependencies.
 *
 * Runs a real `BpmnModeler` headlessly (jsdom + the minimal SVG geometry
 * polyfill), imports {@link SAMPLE_BPMN}, starts the reference modeler with the
 * bundled dependency-free {@link sampleClassifier}, then performs a real edit
 * via the modeler's `modeling` service (removing the external service task) and
 * asserts the governance classification updates accordingly — proving the
 * edit→classify loop against genuine bpmn-js editing.
 */

// @vitest-environment jsdom
import "../test/svg-jsdom-polyfill.js";

import { beforeAll, afterEach, describe, expect, it } from "vitest";
import { axisYMarkerClass } from "@francav/bpmn-js-adapter";
import { startReferenceModeler } from "./modeler.js";
import { SAMPLE_BPMN, sampleClassifier } from "./sample.js";
import type { EditorServices } from "./editor.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ModelerCtor {
  new (opts: { container: HTMLElement }): any;
}

let Modeler: ModelerCtor;

beforeAll(async () => {
  const mod: any = await import("bpmn-js/lib/Modeler.js");
  Modeler = (mod.default ?? mod) as ModelerCtor;
});

async function mountModeler(): Promise<{ editor: any; canvasEl: HTMLElement }> {
  const canvasEl = document.createElement("div");
  document.body.appendChild(canvasEl);
  const editor = new Modeler({ container: canvasEl });
  await editor.importXML(SAMPLE_BPMN);
  return { editor, canvasEl };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("reference modeler harness (real bpmn-js editing)", () => {
  it("classifies the imported model and paints the real canvas", async () => {
    const { editor } = await mountModeler();
    const panels = document.createElement("div");
    document.body.appendChild(panels);

    const session = startReferenceModeler(editor as EditorServices, panels, sampleClassifier, {
      debounceMs: 0,
    });
    await session.reclassify();

    expect(session.result!.matrix.axisY.runtimeBound).toBe(1);
    const canvas: any = editor.get("canvas");
    expect(canvas.hasMarker("Task_Score", axisYMarkerClass("runtimeBound"))).toBe(true);
    expect(canvas.hasMarker("Gateway_Decide", axisYMarkerClass("fullyDeterministic"))).toBe(true);

    session.destroy();
  });

  it("re-classifies after a real edit removes the external service task", async () => {
    const { editor } = await mountModeler();
    const panels = document.createElement("div");
    document.body.appendChild(panels);

    const session = startReferenceModeler(editor as EditorServices, panels, sampleClassifier, {
      debounceMs: 0,
    });
    await session.reclassify();
    expect(session.result!.matrix.axisY.runtimeBound).toBe(1);

    // A genuine edit: remove the external service task via the modeling service.
    const registry: any = editor.get("elementRegistry");
    const modeling: any = editor.get("modeling");
    modeling.removeElements([registry.get("Task_Score")]);

    // The edit fired commandStack.changed; wait for the async re-classify to land.
    await session.reclassify();

    expect(registry.get("Task_Score")).toBeUndefined();
    expect(session.result!.matrix.axisY.runtimeBound).toBe(0);
    expect(session.result!.matrix.axisY.fullyDeterministic).toBe(1);
    expect(session.result!.findings).toHaveLength(0);

    session.destroy();
  });
});
