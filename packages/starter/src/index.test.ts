// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Done-criterion (headless): the bundled sample compiler result is analysed and
 * rendered to a governance report with no DOM, no UI framework, no bpmn-js.
 */

import { describe, expect, it } from "vitest";
import { analyze, renderReport, reportFromCompilerResult } from "./headless.js";
import { SAMPLE_COMPILER_RESULT } from "./sample.js";

describe("headless starter", () => {
  it("maps the sample compiler result onto the view-model", () => {
    const result = analyze(SAMPLE_COMPILER_RESULT);
    expect(result.process.id).toBe("Process_LoanDecision");
    // The service task is runtime-bound + externally coupled; the gateway is
    // fully deterministic + self-contained.
    expect(result.matrix.axisY.runtimeBound).toBe(1);
    expect(result.matrix.axisY.fullyDeterministic).toBe(1);
    expect(result.matrix.axisX.externalCoupled).toBe(1);
    expect(result.matrix.axisX.selfContained).toBe(1);
    expect(result.determinismMap["Task_Score"]?.axisY).toBe("runtimeBound");
  });

  it("renders a report carrying the matrix, findings and contract coverage", () => {
    const report = reportFromCompilerResult(SAMPLE_COMPILER_RESULT);
    expect(report).toContain("DPG governance report");
    expect(report).toContain("Process_LoanDecision");
    expect(report).toContain("Axis Y — determinism");
    expect(report).toContain("Axis X — coupling");
    expect(report).toContain("Contract coverage:  50%");
    // The finding title is the compiler ruleId; the recommendation is its remediation.
    expect(report).toContain("contract-coverage");
    expect(report).toContain("Document the request/response contract");
  });

  it("reports no findings cleanly when there are none", () => {
    const clean = analyze({
      ...SAMPLE_COMPILER_RESULT,
      semanticFindings: [],
      structuralFindings: [],
    });
    expect(renderReport(clean)).toContain("Findings: none");
  });
});
