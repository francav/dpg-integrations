// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Reference profile/policy packs, bundled browser-safely for the classifier.
 *
 * The published `@francav/profiles` / `@francav/policies` packages ship their
 * packs as raw JSON via subpath exports (`@francav/profiles/packs/<id>.json`)
 * AND expose `loadProfilePack`/`loadPolicyPack` loaders. Those default loaders
 * use `node:fs` `readFileSync`, so they DO NOT work in the browser or under the
 * Camunda plugin's esbuild bundle.
 *
 * This module instead **statically imports the raw pack JSON** via the subpath
 * exports, using STRING-LITERAL specifiers only — esbuild inlines a JSON import
 * only when its specifier is a literal (a variable specifier is left
 * un-bundled, which previously surfaced as "No analysis"). The imported objects
 * ARE the snapshots the compiler accepts (`RuntimeProfileSnapshot` /
 * `PolicySnapshot`), so we expose them through `id → snapshot` maps and the
 * `getProfileSnapshot` / `getPolicySnapshot` lookups the classifier uses, plus
 * `AVAILABLE_PROFILES` / `AVAILABLE_POLICIES` (id + human label) to populate the
 * inspector's profile/policy selector.
 */

import type { SelectorOption } from "@francav/components";

/**
 * The snapshot shapes the compiler accepts as its `runtimeProfile` / `policy`
 * options, typed locally (mirroring {@link CompilerClassifierOptions}'s local
 * compiler typing) so this package needs neither `@francav/compiler-core` nor
 * `@francav/profiles`/`policies` type exports at build time. The imported pack
 * JSON is structurally one of these.
 */
export interface RuntimeProfileSnapshot {
  readonly id: string;
  readonly version: string;
  readonly capabilities: Record<string, unknown>;
}

export interface PolicySnapshot {
  readonly id: string;
  readonly version: string;
  readonly governanceTier: string;
  readonly determinism?: Record<string, unknown>;
  readonly runtimeProfileRequired?: boolean;
  readonly ruleToggles: Record<string, boolean>;
}

// Static, literal-specifier JSON imports so esbuild bundles every pack. The
// packages expose their packs through the `./packs/*` → `./packs/*.json` export
// map, so the specifier is the pack id WITHOUT the `.json` extension (the `*`
// wildcard appends it). The resolved target is `.json`, so `resolveJsonModule`
// types these as JSON modules.
import camunda7 from "@francav/profiles/packs/camunda-7" with { type: "json" };
import camunda8 from "@francav/profiles/packs/camunda-8" with { type: "json" };
import cibSeven from "@francav/profiles/packs/cib-seven" with { type: "json" };
import operaton from "@francav/profiles/packs/operaton" with { type: "json" };
import baselineTier1 from "@francav/policies/packs/baseline-tier-1" with { type: "json" };
import baselineTier2 from "@francav/policies/packs/baseline-tier-2" with { type: "json" };

/** id → runtime-profile snapshot, built from the static pack imports. */
const PROFILE_SNAPSHOTS: Record<string, RuntimeProfileSnapshot> = {
  "camunda-7": camunda7 as unknown as RuntimeProfileSnapshot,
  "camunda-8": camunda8 as unknown as RuntimeProfileSnapshot,
  "cib-seven": cibSeven as unknown as RuntimeProfileSnapshot,
  operaton: operaton as unknown as RuntimeProfileSnapshot,
};

/** id → policy snapshot, built from the static pack imports. */
const POLICY_SNAPSHOTS: Record<string, PolicySnapshot> = {
  "baseline-tier-1": baselineTier1 as unknown as PolicySnapshot,
  "baseline-tier-2": baselineTier2 as unknown as PolicySnapshot,
};

/**
 * The runtime-profile packs available to the selector. The `id` is the pack id
 * (what {@link getProfileSnapshot} keys on and what the inspector emits on
 * change); the `label` is human-facing.
 */
export const AVAILABLE_PROFILES: readonly SelectorOption[] = [
  { id: "camunda-7", label: "Camunda 7" },
  { id: "camunda-8", label: "Camunda 8" },
  { id: "cib-seven", label: "CIB seven" },
  { id: "operaton", label: "Operaton" },
];

/** The policy packs available to the selector. */
export const AVAILABLE_POLICIES: readonly SelectorOption[] = [
  { id: "baseline-tier-1", label: "Baseline Tier 1" },
  { id: "baseline-tier-2", label: "Baseline Tier 2" },
];

/**
 * Resolve a runtime-profile snapshot by pack id, or `undefined` if unknown.
 * The classifier forwards the result to the compiler's `runtimeProfile` option.
 */
export function getProfileSnapshot(
  id: string | null | undefined,
): RuntimeProfileSnapshot | undefined {
  return id ? PROFILE_SNAPSHOTS[id] : undefined;
}

/**
 * Resolve a policy snapshot by pack id, or `undefined` if unknown. The
 * classifier forwards the result to the compiler's `policy` option.
 */
export function getPolicySnapshot(id: string | null | undefined): PolicySnapshot | undefined {
  return id ? POLICY_SNAPSHOTS[id] : undefined;
}
