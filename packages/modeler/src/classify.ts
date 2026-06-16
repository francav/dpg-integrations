// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * The classification boundary for the reference modeler.
 *
 * The modeler is governance-only and self-contained: it does not hard-depend on
 * a compiler. Instead it takes an injectable {@link Classifier} — a function
 * from the current BPMN XML to a compiler result (structurally
 * `@dpg/compiler-core`'s `CompilerResult`). A real integration wires in
 * `@dpg/compiler-browser`; the bundled {@link ./sample} ships a small dependency
 * -free classifier so the modeler runs out of the box.
 *
 * Keeping classification injectable is what lets the modeler stay in L4 without
 * pulling the compiler into its dependency graph, and lets it be unit-tested
 * with a deterministic stub.
 */

import type { CompilerResultInput } from "@dpg/components";

/**
 * Classify a process from its BPMN 2.0 XML, producing a compiler result the
 * view-model adapter (`mapCompilerResult`) can render. May be async (a real
 * compiler parses XML); the modeler awaits it.
 */
export type Classifier = (xml: string) => CompilerResultInput | Promise<CompilerResultInput>;
