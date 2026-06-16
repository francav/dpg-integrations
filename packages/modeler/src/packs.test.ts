// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Unit test for the bundled reference packs. Proves the static JSON imports
 * resolve to the real snapshots (so `runtimeProfile`/`policy` forwarded to the
 * compiler differ per id) and that the selector option lists are populated.
 */

import { describe, expect, it } from "vitest";
import {
  AVAILABLE_POLICIES,
  AVAILABLE_PROFILES,
  getPolicySnapshot,
  getProfileSnapshot,
} from "./packs.js";

describe("reference packs", () => {
  it("exposes every reference profile and policy as a selector option", () => {
    expect(AVAILABLE_PROFILES.map((p) => p.id)).toEqual([
      "camunda-7",
      "camunda-8",
      "cib-seven",
      "operaton",
    ]);
    expect(AVAILABLE_POLICIES.map((p) => p.id)).toEqual(["baseline-tier-1", "baseline-tier-2"]);
    for (const opt of [...AVAILABLE_PROFILES, ...AVAILABLE_POLICIES]) {
      expect(opt.label).toBeTruthy();
    }
  });

  it("resolves distinct runtime-profile snapshots by id", () => {
    const c7 = getProfileSnapshot("camunda-7");
    const c8 = getProfileSnapshot("camunda-8");
    expect(c7?.id).toBe("camunda-7");
    expect(c8?.id).toBe("camunda-8");
    // Distinct snapshots → the compiler sees a different runtimeProfile.
    expect(c7?.version).not.toBe(c8?.version);
    expect(c7?.capabilities).toBeTruthy();
  });

  it("resolves distinct policy snapshots by id", () => {
    const t1 = getPolicySnapshot("baseline-tier-1");
    const t2 = getPolicySnapshot("baseline-tier-2");
    expect(t1?.governanceTier).toBe("tier-1");
    expect(t2?.governanceTier).toBe("tier-2");
    expect(t1?.ruleToggles).toBeTruthy();
  });

  it("returns undefined for unknown or absent ids", () => {
    expect(getProfileSnapshot("does-not-exist")).toBeUndefined();
    expect(getProfileSnapshot(undefined)).toBeUndefined();
    expect(getProfileSnapshot(null)).toBeUndefined();
    expect(getPolicySnapshot("nope")).toBeUndefined();
  });
});
