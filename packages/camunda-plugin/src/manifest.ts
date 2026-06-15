// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * dpg-camunda-plugin manifest — the static descriptor the host (Camunda Desktop
 * Modeler) and our own registration code read to identify the plugin and pick
 * its defaults.
 *
 * Kept as plain data (no host import) so it is trivially unit-testable and can
 * be serialised into the plugin's package manifest. The plugin is a *thin
 * shell*: it carries no governance logic of its own — it registers a bpmn-js
 * module and mounts the L3 panels (`@dpg/components`) bound to the canvas via
 * `@dpg/bpmn-js-adapter`, defaulting to a Camunda runtime profile.
 */

/** Stable identifier for this plugin's bpmn-js module / overlays / events. */
export const PLUGIN_ID = "dpg-camunda-plugin";

/** Human-facing name shown in the modeler's plugin surfaces. */
export const PLUGIN_NAME = "DPG Governance";

/**
 * Runtime profile this plugin defaults to. The plugin targets the Camunda
 * Desktop Modeler, whose diagrams are Camunda-7 (`bpmn-js` + camunda moddle),
 * so the determinism result is computed against the `camunda-7` reference
 * profile shipped by `@dpg/profiles` unless the host overrides it.
 */
export const DEFAULT_PROFILE_ID = "camunda-7";

/**
 * Governance policy this plugin defaults to. Tier-2 is the engine-agnostic /
 * policy-dependent baseline — the safe default that does not over-claim
 * determinism before the user has chosen a stricter policy.
 */
export const DEFAULT_POLICY_ID = "baseline-tier-2";

/** The full default manifest, as consumed by {@link registerDpgPlugin}. */
export interface PluginManifest {
  id: string;
  name: string;
  defaultProfileId: string;
  defaultPolicyId: string;
}

export const PLUGIN_MANIFEST: PluginManifest = {
  id: PLUGIN_ID,
  name: PLUGIN_NAME,
  defaultProfileId: DEFAULT_PROFILE_ID,
  defaultPolicyId: DEFAULT_POLICY_ID,
};
