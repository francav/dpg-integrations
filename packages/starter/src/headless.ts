// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Headless starter variant — the smallest possible DPG integration.
 *
 * Takes a compiler result (structurally `@francav/compiler-core`'s `CompilerResult`),
 * maps it onto the framework-neutral {@link AnalysisResult} view-model with
 * `@francav/components`' `mapCompilerResult`, and renders a plain-text governance
 * report. No DOM, no UI framework, no bpmn-js — runnable anywhere Node runs.
 *
 * This is the ~50-line "render governance from compiler output" core the
 * quickstart points at; the canvas variant ({@link ./canvas}) layers the L3
 * components and bpmn-js overlays on top of the very same view-model.
 */

// Must precede the @francav/components import: it bundles DOM-bound custom elements,
// so a plain Node process needs an inert HTMLElement to evaluate the module.
import "./node-dom-guard.js";
import { mapCompilerResult } from "@francav/components";
import type { AnalysisResult, CompilerResultInput, DiagramElementIndex } from "@francav/components";

/** Map a compiler result onto the view-model the report (and UI) render. */
export function analyze(
  compilerResult: CompilerResultInput,
  diagram?: DiagramElementIndex,
): AnalysisResult {
  return mapCompilerResult(compilerResult, diagram);
}

/** Render the analysis view-model as a human-readable governance report. */
export function renderReport(result: AnalysisResult): string {
  const { process, summary, matrix, findings } = result;
  const lines: string[] = [];

  lines.push(`DPG governance report — ${process.name} (${process.id})`);
  lines.push("=".repeat(48));
  lines.push(`Maturity:           ${summary.maturitySignal ?? "n/a"}`);
  lines.push(`Score:              ${summary.score ?? "n/a"}`);
  lines.push(`Contract coverage:  ${Math.round(summary.contractCoverageRatio * 100)}%`);
  if (summary.degradedFlags.length > 0) {
    lines.push(`Degraded:           ${summary.degradedFlags.join(", ")}`);
  }

  lines.push("");
  lines.push("Axis Y — determinism:");
  lines.push(`  fully deterministic ${matrix.axisY.fullyDeterministic}`);
  lines.push(`  policy dependent    ${matrix.axisY.policyDependent}`);
  lines.push(`  runtime bound       ${matrix.axisY.runtimeBound}`);

  lines.push("");
  lines.push("Axis X — coupling:");
  lines.push(`  self contained      ${matrix.axisX.selfContained}`);
  lines.push(`  profile scoped      ${matrix.axisX.profileScoped}`);
  lines.push(`  engine specific     ${matrix.axisX.engineSpecific}`);
  lines.push(`  external coupled    ${matrix.axisX.externalCoupled}`);

  lines.push("");
  if (findings.length === 0) {
    lines.push("Findings: none");
  } else {
    lines.push(`Findings (${findings.length}):`);
    for (const f of findings) {
      const where = f.elementId ? ` @${f.elementId}` : "";
      lines.push(`  [${f.severity}]${where} ${f.title} — ${f.recommendation}`);
    }
  }

  return lines.join("\n");
}

/** Convenience: compiler result → governance report text in one call. */
export function reportFromCompilerResult(
  compilerResult: CompilerResultInput,
  diagram?: DiagramElementIndex,
): string {
  return renderReport(analyze(compilerResult, diagram));
}
