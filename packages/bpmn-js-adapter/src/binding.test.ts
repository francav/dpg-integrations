// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "@francav/components";
import { DpgCanvasBinding, bindAnalysisToCanvas } from "./index.js";
import { axisYMarkerClass } from "./overlay-html.js";
import { FakeDiagram } from "../test/fake-diagram.js";
import { SAMPLE_ANALYSIS, SAMPLE_ELEMENT_IDS } from "../test/fixtures.js";

const ALL_IDS = Object.values(SAMPLE_ELEMENT_IDS);

describe("DpgCanvasBinding", () => {
  it("applies an Axis-Y determinism ring marker to classified elements", () => {
    const diagram = new FakeDiagram([...ALL_IDS]);
    const report = new DpgCanvasBinding(diagram).apply(SAMPLE_ANALYSIS);

    expect(diagram.markersFor(SAMPLE_ELEMENT_IDS.task)).toContain(axisYMarkerClass("runtimeBound"));
    expect(diagram.markersFor(SAMPLE_ELEMENT_IDS.gateway)).toContain(
      axisYMarkerClass("fullyDeterministic"),
    );
    expect(report.markersAdded).toBe(2);
  });

  it("adds an Axis-X coupling badge overlay only when the class has a shape", () => {
    const diagram = new FakeDiagram([...ALL_IDS]);
    bindAnalysisToCanvas(diagram, SAMPLE_ANALYSIS);

    const taskOverlays = diagram.overlaysList.filter((o) => o.element === SAMPLE_ELEMENT_IDS.task);
    // task = externalCoupled (triangle badge) + a finding marker.
    expect(taskOverlays.some((o) => String(o.attrs.html).includes("axis-x-badge"))).toBe(true);

    // gateway = selfContained → no badge overlay.
    const gatewayOverlays = diagram.overlaysList.filter(
      (o) => o.element === SAMPLE_ELEMENT_IDS.gateway,
    );
    expect(gatewayOverlays.some((o) => String(o.attrs.html).includes("axis-x-badge"))).toBe(false);
  });

  it("adds a finding marker overlay on the flagged element", () => {
    const diagram = new FakeDiagram([...ALL_IDS]);
    bindAnalysisToCanvas(diagram, SAMPLE_ANALYSIS);

    const markers = diagram.overlaysList.filter((o) =>
      String(o.attrs.html).includes("finding-marker"),
    );
    expect(markers).toHaveLength(1);
    expect(markers[0]!.element).toBe(SAMPLE_ELEMENT_IDS.task);
    expect(String(markers[0]!.attrs.html)).toContain("finding-warning");
  });

  it("reports unmatched view-model ids and skips them", () => {
    const diagram = new FakeDiagram([SAMPLE_ELEMENT_IDS.gateway]); // task missing
    const report = new DpgCanvasBinding(diagram).apply(SAMPLE_ANALYSIS);

    expect(report.matched).toContain(SAMPLE_ELEMENT_IDS.gateway);
    expect(report.unmatched).toContain(SAMPLE_ELEMENT_IDS.task);
    expect(diagram.markersFor(SAMPLE_ELEMENT_IDS.task)).toHaveLength(0);
  });

  it("reconciles namespace-prefixed view-model ids to the diagram's local id", () => {
    const diagram = new FakeDiagram(["Task_Score"]);
    const prefixed: AnalysisResult = {
      ...SAMPLE_ANALYSIS,
      findings: [],
      determinismMap: {
        "bpmn:Task_Score": {
          axisY: "policyDependent",
          axisX: "profileScoped",
          rationale: "x",
        },
      },
    };
    const report = new DpgCanvasBinding(diagram).apply(prefixed);

    expect(report.matched).toContain("bpmn:Task_Score");
    expect(diagram.markersFor("Task_Score")).toContain(axisYMarkerClass("policyDependent"));
  });

  it("is reversible: clear() removes every decoration it added", () => {
    const diagram = new FakeDiagram([...ALL_IDS]);
    const binding = bindAnalysisToCanvas(diagram, SAMPLE_ANALYSIS);

    expect(diagram.overlaysList.length).toBeGreaterThan(0);
    binding.clear();

    expect(diagram.overlaysList).toHaveLength(0);
    expect(diagram.markersFor(SAMPLE_ELEMENT_IDS.task)).toHaveLength(0);
    expect(diagram.markersFor(SAMPLE_ELEMENT_IDS.gateway)).toHaveLength(0);
  });

  it("is idempotent: re-apply does not accumulate decorations", () => {
    const diagram = new FakeDiagram([...ALL_IDS]);
    const binding = new DpgCanvasBinding(diagram);
    binding.apply(SAMPLE_ANALYSIS);
    const firstCount = diagram.overlaysList.length;
    binding.apply(SAMPLE_ANALYSIS);

    expect(diagram.overlaysList.length).toBe(firstCount);
  });

  it("honours options that disable decoration kinds", () => {
    const diagram = new FakeDiagram([...ALL_IDS]);
    new DpgCanvasBinding(diagram, {
      determinismRing: false,
      couplingBadge: false,
      findingMarkers: false,
    }).apply(SAMPLE_ANALYSIS);

    expect(diagram.overlaysList).toHaveLength(0);
    expect(diagram.markersFor(SAMPLE_ELEMENT_IDS.task)).toHaveLength(0);
  });
});
