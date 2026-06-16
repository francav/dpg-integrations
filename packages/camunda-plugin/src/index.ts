// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * dpg-camunda-plugin — a thin shell that brings DPG governance into the Camunda
 * Desktop Modeler.
 *
 * It owns no governance logic. It:
 *  - declares a plugin {@link PLUGIN_MANIFEST} (id, name, Camunda defaults),
 *  - registers a bpmn-js module + client extension with the modeler host
 *    ({@link registerDpgPlugin}), and
 *  - mounts the L3 panels (`@francav/components`) and binds the analysis onto the
 *    canvas (`@francav/bpmn-js-adapter`) for a diagram ({@link DpgPanelHost}),
 *    defaulting to the Camunda runtime profile.
 *
 * @example
 * ```ts
 * import { registerDpgPlugin, DpgPanelHost } from "dpg-camunda-plugin";
 * import { mapCompilerResult } from "@francav/components";
 *
 * // 1. register with the modeler host (client plugin entry):
 * registerDpgPlugin(modelerPluginHelpers);
 *
 * // 2. when a diagram is analysed, mount the governance UI:
 * const result = mapCompilerResult(compilerResult, { elements });
 * const panels = new DpgPanelHost(panelContainer, bpmnViewer).mount(result);
 * // later: panels.update(nextResult) / panels.destroy();
 * ```
 */

export {
  PLUGIN_ID,
  PLUGIN_NAME,
  DEFAULT_PROFILE_ID,
  DEFAULT_POLICY_ID,
  PLUGIN_MANIFEST,
} from "./manifest.js";
export type { PluginManifest } from "./manifest.js";

export { registerDpgPlugin, buildBpmnModule } from "./registration.js";
export type {
  ModelerPluginHelpers,
  BpmnJsAdditionalModule,
  RegistrationReport,
} from "./registration.js";

export { DpgPanelHost } from "./panel-host.js";
export type { PanelHostOptions, MountedPanels } from "./panel-host.js";
