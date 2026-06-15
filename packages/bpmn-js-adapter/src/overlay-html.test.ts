// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { describe, expect, it } from "vitest";
import {
  axisXBadgeHtml,
  axisYMarkerClass,
  dpgStylesheet,
  escapeHtml,
  findingMarkerHtml,
} from "./overlay-html.js";
import { AXIS_X_STYLE, AXIS_Y_STYLE } from "./presentation.js";

describe("overlay-html", () => {
  it("escapes HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });

  it("emits a coupling badge for shaped Axis-X classes and null otherwise", () => {
    expect(axisXBadgeHtml("selfContained")).toBeNull();

    const circle = axisXBadgeHtml("profileScoped");
    expect(circle).toContain("<circle");
    expect(circle).toContain(AXIS_X_STYLE.profileScoped.color);

    expect(axisXBadgeHtml("engineSpecific")).toContain("<rect");
    expect(axisXBadgeHtml("externalCoupled")).toContain("<path");
  });

  it("renders a finding marker with a count and severity class", () => {
    expect(findingMarkerHtml("warning", 1)).toContain("finding-warning");
    expect(findingMarkerHtml("error", 3)).toContain(">3<");
  });

  it("derives a per-class Axis-Y marker class", () => {
    expect(axisYMarkerClass("runtimeBound")).toBe("dpg-axis-y-runtimeBound");
  });

  it("produces a stylesheet referencing every Axis-Y colour", () => {
    const css = dpgStylesheet();
    for (const style of Object.values(AXIS_Y_STYLE)) {
      expect(css).toContain(style.color);
    }
  });
});
