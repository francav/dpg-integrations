// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * The real DPG classifier: a {@link Classifier} backed by the
 * `@francav/compiler-browser` engine.
 *
 * This is the shipping classifier for the reference modeler and the Camunda
 * plugin. It exports the editor's BPMN 2.0 XML, hands it to
 * `compileModelInBrowser({ modelId, bpmnXml })`, and returns the real
 * `CompilerResult`. That result is a structural superset of
 * `@francav/components`' {@link CompilerResultInput} (same
 * `metadata`/`structuralFindings`/`semanticFindings`/`determinismMap`/
 * `runtimeDependencyMap`/`summary`, plus extra fields), so it passes straight to
 * `mapCompilerResult` with no adapter.
 *
 * **Optional dynamic dependency.** `@francav/compiler-browser` is loaded via a
 * dynamic `import()` and is NOT a build-time dependency of this package: the
 * slice we use is typed locally, so `tsc -b` / lint / test stay green without
 * the compiler in the dependency graph. The package only needs to be resolvable
 * at *runtime* (for the reference modeler) or at *bundle* time (for the Camunda
 * plugin's `build:plugin`, where esbuild inlines the dynamic import). If it is
 * absent, the classifier throws an actionable error naming the package.
 *
 * The dependency-free {@link sampleClassifier} remains exported as a test/demo
 * fallback fixture only — it is no longer the shipping default.
 */

import type { CompilerResultInput } from "@francav/components";
import type { Classifier } from "./classify.js";

/**
 * The slice of `@francav/compiler-browser` we use, typed locally so the build does
 * not need the package present. Mirrors `compileModelInBrowser`'s signature;
 * the real `CompilerResult` it returns is structurally a {@link CompilerResultInput}.
 */
interface CompilerBrowserModule {
  compileModelInBrowser(options: {
    modelId: string;
    bpmnXml: string;
  }): Promise<CompilerResultInput>;
}

/** The module specifier loaded dynamically — kept here so it is swappable. */
const COMPILER_MODULE = "@francav/compiler-browser";

export interface CompilerClassifierOptions {
  /**
   * The model id stamped onto `metadata.modelId`. When omitted, a stable id is
   * derived from the BPMN `<process id="…">` (falling back to `"process"`).
   */
  modelId?: string;
}

const PROCESS_ID_RE = /<(?:[\w-]+:)?process\b[^>]*\bid="([^"]+)"/;

/** Derive a stable model id from the diagram's process id, or a constant. */
function deriveModelId(xml: string): string {
  return PROCESS_ID_RE.exec(xml)?.[1] ?? "process";
}

// Cache the dynamic import so the engine is loaded at most once per session.
let compilerPromise: Promise<CompilerBrowserModule> | undefined;

async function loadCompiler(): Promise<CompilerBrowserModule> {
  if (!compilerPromise) {
    compilerPromise = (async (): Promise<CompilerBrowserModule> => {
      try {
        const mod = (await import(COMPILER_MODULE)) as Partial<CompilerBrowserModule>;
        if (typeof mod.compileModelInBrowser !== "function") {
          throw new Error("loaded module does not export compileModelInBrowser");
        }
        return mod as CompilerBrowserModule;
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `cannot classify the model: the "${COMPILER_MODULE}" engine is not available (${detail}).\n` +
            `Install it next to dpg-modeler, or pass a different classifier (e.g. the bundled sampleClassifier for tests/demos).`,
        );
      }
    })();
  }
  return compilerPromise;
}

/**
 * Build the real DPG classifier. Returns an async {@link Classifier} that, on
 * each call, derives a model id, lazily loads `@francav/compiler-browser`, and
 * returns `compileModelInBrowser({ modelId, bpmnXml })`. The result is
 * structurally a {@link CompilerResultInput} and is returned as-is.
 *
 * @example
 * ```ts
 * import { startReferenceModeler, createCompilerClassifier } from "dpg-modeler";
 * const session = startReferenceModeler(editor, panels, createCompilerClassifier());
 * ```
 */
export function createCompilerClassifier(options: CompilerClassifierOptions = {}): Classifier {
  return async (xml: string): Promise<CompilerResultInput> => {
    const modelId = options.modelId ?? deriveModelId(xml);
    const { compileModelInBrowser } = await loadCompiler();
    return compileModelInBrowser({ modelId, bpmnXml: xml });
  };
}
