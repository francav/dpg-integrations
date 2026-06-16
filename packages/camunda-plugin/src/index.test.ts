// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

// The public barrel re-exports the DOM-mounting panel host, whose dependency
// (`@francav/components`) references `HTMLElement` at module load, so the barrel
// smoke-test runs under jsdom.
// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  DEFAULT_POLICY_ID,
  DEFAULT_PROFILE_ID,
  PLUGIN_ID,
  PLUGIN_MANIFEST,
  PLUGIN_NAME,
} from "./index.js";

describe("plugin manifest", () => {
  it("defaults to the Camunda runtime profile and the tier-2 baseline policy", () => {
    expect(DEFAULT_PROFILE_ID).toBe("camunda-7");
    expect(DEFAULT_POLICY_ID).toBe("baseline-tier-2");
  });

  it("exposes a stable id and a human-facing name", () => {
    expect(PLUGIN_ID).toBe("dpg-camunda-plugin");
    expect(PLUGIN_NAME).toMatch(/DPG/);
  });

  it("bundles the constants into a single manifest object", () => {
    expect(PLUGIN_MANIFEST).toEqual({
      id: PLUGIN_ID,
      name: PLUGIN_NAME,
      defaultProfileId: DEFAULT_PROFILE_ID,
      defaultPolicyId: DEFAULT_POLICY_ID,
    });
  });
});
