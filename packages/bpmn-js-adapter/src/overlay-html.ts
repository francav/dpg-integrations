// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Pure HTML builders for the overlay decorations. Returned as strings so they
 * can be handed straight to the diagram-js `overlays` service without requiring
 * a DOM in the adapter itself (the host browser owns the DOM). Kept pure for
 * straightforward unit testing.
 */

import { AXIS_X_STYLE, AXIS_Y_STYLE, FINDING_STYLE } from "./presentation.js";
import type {
  AxisXClassification,
  AxisYClassification,
  FindingSeverity,
} from "@francav/components";

/** CSS class prefix for every node this adapter injects (markers + overlays). */
export const DPG_CLASS_PREFIX = "dpg";

/** Escape a string for safe interpolation into an HTML attribute or text node. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Corner badge (Axis X coupling) as an inline-styled SVG. */
export function axisXBadgeHtml(axisX: AxisXClassification): string | null {
  const style = AXIS_X_STYLE[axisX];
  if (!style.shape) return null;

  const s = 6;
  const stroke = `stroke="#ffffff" stroke-width="1.5"`;
  let shape: string;
  if (style.shape === "circle") {
    shape = `<circle cx="${s}" cy="${s}" r="${s - 1}" fill="${style.color}" ${stroke} />`;
  } else if (style.shape === "square") {
    shape = `<rect x="1" y="1" width="${s * 2 - 2}" height="${s * 2 - 2}" rx="1" fill="${style.color}" ${stroke} />`;
  } else {
    shape = `<path d="M ${s},1 L ${s * 2 - 1},${s * 2 - 1} L 1,${s * 2 - 1} Z" fill="${style.color}" ${stroke} />`;
  }

  return (
    `<div class="${DPG_CLASS_PREFIX}-axis-x-badge" title="${escapeHtml(style.title)}" ` +
    `aria-label="${escapeHtml(style.title)}">` +
    `<svg width="${s * 2}" height="${s * 2}" viewBox="0 0 ${s * 2} ${s * 2}">${shape}</svg>` +
    `</div>`
  );
}

/** A small finding pill (worst severity targeting the element). */
export function findingMarkerHtml(severity: FindingSeverity, count: number): string {
  const style = FINDING_STYLE[severity];
  const text = count > 1 ? String(count) : "!";
  return (
    `<div class="${DPG_CLASS_PREFIX}-finding-marker ${DPG_CLASS_PREFIX}-finding-${severity}" ` +
    `title="${escapeHtml(style.title)}" aria-label="${escapeHtml(`${count} ${style.title.toLowerCase()} finding(s)`)}" ` +
    `style="background:${style.color}">${escapeHtml(text)}</div>`
  );
}

/** The marker CSS class applied to the element body for an Axis-Y class. */
export function axisYMarkerClass(axisY: AxisYClassification): string {
  return `${DPG_CLASS_PREFIX}-axis-y-${axisY}`;
}

/** Inline stylesheet realising the Axis-Y ring + decoration positioning. */
export function dpgStylesheet(): string {
  const ring = (cls: AxisYClassification) =>
    `.${axisYMarkerClass(cls)} .djs-visual > :nth-child(1) { ` +
    `stroke: ${AXIS_Y_STYLE[cls].color} !important; stroke-width: 3px !important; }`;

  return [
    ...(Object.keys(AXIS_Y_STYLE) as AxisYClassification[]).map(ring),
    `.${DPG_CLASS_PREFIX}-axis-x-badge { pointer-events: none; }`,
    `.${DPG_CLASS_PREFIX}-finding-marker { display: inline-flex; align-items: center; justify-content: center;` +
      ` min-width: 14px; height: 14px; padding: 0 3px; border-radius: 7px; color: #fff;` +
      ` font: 600 10px/1 sans-serif; pointer-events: none; }`,
  ].join("\n");
}
