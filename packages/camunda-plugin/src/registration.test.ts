// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { describe, expect, it, vi } from "vitest";
import { buildBpmnModule, registerDpgPlugin } from "./registration.js";
import type { BpmnJsAdditionalModule } from "./registration.js";
import { PLUGIN_ID } from "./manifest.js";

describe("registerDpgPlugin", () => {
  it("registers a bpmn-js module and a client extension on a full host", () => {
    const registerBpmnJSPlugin = vi.fn();
    const registerClientExtension = vi.fn();
    const extension = { kind: "panel" };

    const report = registerDpgPlugin({ registerBpmnJSPlugin, registerClientExtension }, extension);

    expect(registerBpmnJSPlugin).toHaveBeenCalledTimes(1);
    expect(registerClientExtension).toHaveBeenCalledWith(extension);
    expect(report.registeredBpmnModule).toBe(true);
    expect(report.registeredClientExtension).toBe(true);
    expect(report.manifest.id).toBe(PLUGIN_ID);
  });

  it("does not register a client extension when none is supplied", () => {
    const registerClientExtension = vi.fn();
    const report = registerDpgPlugin({
      registerBpmnJSPlugin: vi.fn(),
      registerClientExtension,
    });
    expect(registerClientExtension).not.toHaveBeenCalled();
    expect(report.registeredClientExtension).toBe(false);
  });

  it("tolerates a host missing the helper methods", () => {
    const report = registerDpgPlugin({}, { kind: "panel" });
    expect(report.registeredBpmnModule).toBe(false);
    expect(report.registeredClientExtension).toBe(false);
    expect(report.manifest.id).toBe(PLUGIN_ID);
  });

  it("builds a non-empty diagram-js module keyed by the plugin id", () => {
    const mod: BpmnJsAdditionalModule = buildBpmnModule();
    expect(mod.__init__).toContain("dpgGovernance");
    const [lifecycle, Ctor] = mod.dpgGovernance as [string, new () => { pluginId: string }];
    expect(lifecycle).toBe("type");
    expect(new Ctor().pluginId).toBe(PLUGIN_ID);
  });
});
