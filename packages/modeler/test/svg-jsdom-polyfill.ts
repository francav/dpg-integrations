// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * jsdom ships no SVG layout/geometry engine, so diagram-js (which bpmn-js builds
 * on) cannot import or render a diagram under it out of the box. This module
 * installs the minimal, self-contained subset diagram-js + tiny-svg touch during
 * `importXML` and overlay positioning:
 *   - element geometry (`getBBox`, `getCTM`, `getScreenCTM`)
 *   - the SVG matrix/transform value-types (`createSVGMatrix`,
 *     `createSVGTransform*`) and a working `transform.baseVal` transform list.
 *
 * It also stubs `CSS.escape`, which the full bpmn-js `Modeler`'s editing UI
 * touches but jsdom lacks.
 *
 * It is deliberately a flat-identity-geometry stand-in: enough for the modeler's
 * harness test to drive a real bpmn-js `Modeler` headlessly — import, edit, and
 * re-classify — and assert markers/overlays land on the real canvas. Test-only;
 * lives outside `src/`.
 *
 * Importing this module (in a jsdom environment) installs the polyfills.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

class FakeMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
  multiply(_other: FakeMatrix): FakeMatrix {
    return this;
  }
  inverse(): FakeMatrix {
    return new FakeMatrix();
  }
  translate(_x: number, _y: number): FakeMatrix {
    return this;
  }
  scale(_s: number): FakeMatrix {
    return this;
  }
  scaleNonUniform(_sx: number, _sy: number): FakeMatrix {
    return this;
  }
}

class FakeTransform {
  matrix = new FakeMatrix();
  type = 1;
  setMatrix(m: FakeMatrix): void {
    this.matrix = m;
  }
}

class FakeTransformList {
  private items: FakeTransform[] = [];
  get numberOfItems(): number {
    return this.items.length;
  }
  clear(): void {
    this.items = [];
  }
  appendItem(t: FakeTransform): FakeTransform {
    this.items.push(t);
    return t;
  }
  getItem(i: number): FakeTransform {
    return this.items[i] ?? new FakeTransform();
  }
  createSVGTransformFromMatrix(m: FakeMatrix): FakeTransform {
    const t = new FakeTransform();
    t.setMatrix(m);
    return t;
  }
  consolidate(): FakeTransform {
    return this.items[0] ?? new FakeTransform();
  }
}

export function installSvgPolyfill(): void {
  const g = globalThis as any;

  // The full bpmn-js `Modeler` mounts editing UI (e.g. the palette) that calls
  // `CSS.escape`, which jsdom does not provide. A minimal stand-in is enough for
  // the headless editor harness.
  if (typeof g.CSS === "undefined") {
    g.CSS = { escape: (value: string) => String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&") };
  } else if (typeof g.CSS.escape !== "function") {
    g.CSS.escape = (value: string) => String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  const SVGEl = g.SVGElement;
  if (!SVGEl) return;
  const proto = SVGEl.prototype as any;

  if (typeof g.SVGMatrix === "undefined") g.SVGMatrix = FakeMatrix;
  if (typeof g.SVGTransform === "undefined") g.SVGTransform = FakeTransform;

  if (typeof proto.getBBox !== "function") {
    proto.getBBox = () => ({ x: 0, y: 0, width: 100, height: 100 });
  }
  const matrix = () => new FakeMatrix();
  if (typeof proto.getCTM !== "function") proto.getCTM = matrix;
  if (typeof proto.getScreenCTM !== "function") proto.getScreenCTM = matrix;
  if (typeof proto.createSVGMatrix !== "function") proto.createSVGMatrix = matrix;
  if (typeof proto.createSVGTransform !== "function") {
    proto.createSVGTransform = () => new FakeTransform();
  }
  if (typeof proto.createSVGTransformFromMatrix !== "function") {
    proto.createSVGTransformFromMatrix = (m: FakeMatrix) => {
      const t = new FakeTransform();
      t.setMatrix(m);
      return t;
    };
  }
  if (typeof proto.createSVGPoint !== "function") {
    proto.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform: () => ({ x: 0, y: 0 }) });
  }

  // A per-element transform list backing `node.transform.baseVal`.
  if (!Object.getOwnPropertyDescriptor(proto, "transform")) {
    const lists = new WeakMap<object, FakeTransformList>();
    Object.defineProperty(proto, "transform", {
      configurable: true,
      get(this: object) {
        let list = lists.get(this);
        if (!list) {
          list = new FakeTransformList();
          lists.set(this, list);
        }
        return { baseVal: list, animVal: list };
      },
    });
  }
}

installSvgPolyfill();
