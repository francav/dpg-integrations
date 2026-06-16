// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * The classification boundary for the reference modeler.
 *
 * The modeler is governance-only and self-contained: it does not hard-depend on
 * a compiler. Instead it takes an injectable {@link Classifier} — a function
 * from the current BPMN XML to a compiler result (structurally
 * `@francav/compiler-core`'s `CompilerResult`). A real integration wires in
 * `@francav/compiler-browser`; the bundled {@link ./sample} ships a small dependency
 * -free classifier so the modeler runs out of the box.
 *
 * Keeping classification injectable is what lets the modeler stay in L4 without
 * pulling the compiler into its dependency graph, and lets it be unit-tested
 * with a deterministic stub.
 */

import type { CompilerResultInput } from "@francav/components";

/**
 * The governance pack selection a classification runs against: the currently
 * selected runtime-profile and policy pack ids (as emitted by the inspector's
 * profile/policy selector). Both are optional — the dependency-free
 * {@link sampleClassifier} and other headless paths ignore them; the real
 * {@link createCompilerClassifier} resolves them to snapshots and forwards them
 * to the compiler so changing the pack re-runs the analysis against it.
 */
export interface ClassifyOptions {
  /** The selected runtime-profile pack id (e.g. `"camunda-7"`). */
  profileId?: string;
  /** The selected policy pack id (e.g. `"baseline-tier-1"`). */
  policyId?: string;
}

/**
 * Classify a process from its BPMN 2.0 XML, producing a compiler result the
 * view-model adapter (`mapCompilerResult`) can render. May be async (a real
 * compiler parses XML); the modeler awaits it.
 *
 * The optional {@link ClassifyOptions} carry the active profile/policy pack ids
 * so a real classifier can re-run the analysis against the chosen packs; a
 * dependency-free or headless classifier may ignore them.
 */
export type Classifier = (
  xml: string,
  opts?: ClassifyOptions,
) => CompilerResultInput | Promise<CompilerResultInput>;
