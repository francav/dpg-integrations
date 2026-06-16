// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Host registration for the Camunda Desktop Modeler.
 *
 * The Camunda Modeler loads a client plugin and calls into the modeler's
 * plugin-helper API to register additional bpmn-js modules and client
 * extensions. This module is the *thin shell* that performs that registration:
 * it hands the host a bpmn-js additional-module descriptor and records the
 * plugin manifest, but contains no governance logic of its own.
 *
 * The host API is described structurally (no hard import of
 * `camunda-modeler-plugin-helpers`) so the plugin stays tolerant of the modeler
 * version, exactly as the canvas adapter stays tolerant of the bpmn-js version.
 */

import { PLUGIN_ID, PLUGIN_MANIFEST } from "./manifest.js";
import type { PluginManifest } from "./manifest.js";

/**
 * The slice of the Camunda Modeler plugin-helper API this shell uses.
 * `registerBpmnJSPlugin` adds a diagram-js module to every bpmn-js instance the
 * modeler creates; `registerClientExtension` mounts a host-side React/DOM
 * extension. Both are optional so partial/older hosts still register cleanly.
 */
export interface ModelerPluginHelpers {
  registerBpmnJSPlugin?(module: BpmnJsAdditionalModule): void;
  registerClientExtension?(extension: unknown): void;
}

/**
 * A diagram-js additional-module descriptor: an `__init__` list naming the
 * services to instantiate eagerly, plus each service's factory registration.
 * This is the long-stable shape diagram-js consumes.
 */
export interface BpmnJsAdditionalModule {
  __init__: string[];
  [service: string]: unknown;
}

/** What a successful {@link registerDpgPlugin} call did, for tests/harnesses. */
export interface RegistrationReport {
  manifest: PluginManifest;
  registeredBpmnModule: boolean;
  registeredClientExtension: boolean;
}

/**
 * Register the DPG governance plugin against a Camunda Modeler host.
 *
 * Idempotent in spirit: it only calls the helper methods the host actually
 * exposes, and returns a report of what it registered. The bpmn-js module it
 * registers is a no-op marker service (`__init__`) keyed by {@link PLUGIN_ID};
 * the actual decorations are painted by `@francav/bpmn-js-adapter` once a result is
 * available, via {@link DpgPanelHost}.
 */
export function registerDpgPlugin(
  helpers: ModelerPluginHelpers,
  clientExtension?: unknown,
): RegistrationReport {
  const report: RegistrationReport = {
    manifest: PLUGIN_MANIFEST,
    registeredBpmnModule: false,
    registeredClientExtension: false,
  };

  if (typeof helpers.registerBpmnJSPlugin === "function") {
    helpers.registerBpmnJSPlugin(buildBpmnModule());
    report.registeredBpmnModule = true;
  }

  if (clientExtension !== undefined && typeof helpers.registerClientExtension === "function") {
    helpers.registerClientExtension(clientExtension);
    report.registeredClientExtension = true;
  }

  return report;
}

/**
 * Build the diagram-js additional-module the plugin contributes. It declares a
 * single eagerly-instantiated marker service so the module is non-empty and the
 * plugin's presence is observable on every bpmn-js instance; the marker holds
 * the plugin id and nothing else.
 */
export function buildBpmnModule(): BpmnJsAdditionalModule {
  const serviceName = "dpgGovernance";
  return {
    __init__: [serviceName],
    [serviceName]: [
      "type",
      class DpgGovernanceMarker {
        readonly pluginId = PLUGIN_ID;
      },
    ],
  };
}
