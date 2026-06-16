// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { describe, expect, it, vi } from "vitest";
import { DpgCanvasSelection, resolveDiagramId } from "./index.js";
import { FakeDiagram } from "../test/fake-diagram.js";

const IDS = ["StartEvent_1", "Task_Score", "Gateway_Decide"];

describe("resolveDiagramId", () => {
  it("resolves an id verbatim", () => {
    const diagram = new FakeDiagram([...IDS]);
    const registry = diagram.get("elementRegistry");
    expect(resolveDiagramId(registry, "Task_Score")).toBe("Task_Score");
  });

  it("falls back to the local part after a namespace separator", () => {
    const diagram = new FakeDiagram([...IDS]);
    const registry = diagram.get("elementRegistry");
    expect(resolveDiagramId(registry, "ns:Task_Score")).toBe("Task_Score");
    expect(resolveDiagramId(registry, "{urn}Gateway_Decide")).toBe("Gateway_Decide");
  });

  it("returns undefined for an unknown id", () => {
    const diagram = new FakeDiagram([...IDS]);
    const registry = diagram.get("elementRegistry");
    expect(resolveDiagramId(registry, "Nope")).toBeUndefined();
  });
});

describe("DpgCanvasSelection", () => {
  it("selectElement resolves and calls selection.select with the element", () => {
    const diagram = new FakeDiagram([...IDS]);
    const sel = new DpgCanvasSelection(diagram);

    expect(sel.selectElement("Task_Score")).toBe(true);
    expect(diagram.selected).toEqual([{ id: "Task_Score" }]);
  });

  it("selectElement resolves a namespace-prefixed id to the diagram element", () => {
    const diagram = new FakeDiagram([...IDS]);
    const sel = new DpgCanvasSelection(diagram);

    expect(sel.selectElement("pool:Gateway_Decide")).toBe(true);
    expect(diagram.selected).toEqual([{ id: "Gateway_Decide" }]);
  });

  it("selectElement no-ops and returns false for an unknown element", () => {
    const diagram = new FakeDiagram([...IDS]);
    const sel = new DpgCanvasSelection(diagram);

    expect(sel.selectElement("Missing")).toBe(false);
    expect(diagram.selected).toEqual([]);
  });

  it("centerElement calls canvas.scrollToElement with the resolved element", () => {
    const diagram = new FakeDiagram([...IDS]);
    const sel = new DpgCanvasSelection(diagram);

    expect(sel.centerElement("Task_Score")).toBe(true);
    expect(diagram.scrolledTo).toEqual([{ id: "Task_Score" }]);
  });

  it("centerElement tolerates the absence of scrollToElement", () => {
    const diagram = new FakeDiagram([...IDS], { withScrollToElement: false });
    const sel = new DpgCanvasSelection(diagram);

    expect(sel.centerElement("Task_Score")).toBe(false);
    expect(diagram.scrolledTo).toEqual([]);
  });

  it("focusElement selects and centers (the common path)", () => {
    const diagram = new FakeDiagram([...IDS]);
    const sel = new DpgCanvasSelection(diagram);

    expect(sel.focusElement("Gateway_Decide")).toBe(true);
    expect(diagram.selected).toEqual([{ id: "Gateway_Decide" }]);
    expect(diagram.scrolledTo).toEqual([{ id: "Gateway_Decide" }]);
  });

  it("focusElement still selects when centering is unavailable", () => {
    const diagram = new FakeDiagram([...IDS], { withScrollToElement: false });
    const sel = new DpgCanvasSelection(diagram);

    expect(sel.focusElement("Gateway_Decide")).toBe(true);
    expect(diagram.selected).toEqual([{ id: "Gateway_Decide" }]);
    expect(diagram.scrolledTo).toEqual([]);
  });

  it("onCanvasSelect fires the callback on selection.changed with the first id", () => {
    const diagram = new FakeDiagram([...IDS]);
    const sel = new DpgCanvasSelection(diagram);
    const seen: (string | null)[] = [];

    const unsubscribe = sel.onCanvasSelect((id) => seen.push(id));
    diagram.fireSelectionChanged([{ id: "Task_Score" }, { id: "Gateway_Decide" }]);
    diagram.fireSelectionChanged([]);

    expect(seen).toEqual(["Task_Score", null]);

    unsubscribe();
    expect(diagram.busListenerCount("selection.changed")).toBe(0);
    diagram.fireSelectionChanged([{ id: "StartEvent_1" }]);
    expect(seen).toEqual(["Task_Score", null]);
  });

  describe("graceful no-ops when services are missing", () => {
    it("selectElement no-ops when the selection service is absent", () => {
      const diagram = new FakeDiagram([...IDS], { withSelection: false });
      const sel = new DpgCanvasSelection(diagram);
      expect(sel.selectElement("Task_Score")).toBe(false);
    });

    it("focusElement returns false but still tries to center when selection is absent", () => {
      const diagram = new FakeDiagram([...IDS], { withSelection: false });
      const sel = new DpgCanvasSelection(diagram);
      expect(sel.focusElement("Task_Score")).toBe(false);
      // centering is best-effort and still happens.
      expect(diagram.scrolledTo).toEqual([{ id: "Task_Score" }]);
    });

    it("onCanvasSelect returns a no-op unsubscribe when eventBus is absent", () => {
      const diagram = new FakeDiagram([...IDS], { withEventBus: false });
      const sel = new DpgCanvasSelection(diagram);
      const cb = vi.fn();
      const unsubscribe = sel.onCanvasSelect(cb);
      expect(typeof unsubscribe).toBe("function");
      expect(() => unsubscribe()).not.toThrow();
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
