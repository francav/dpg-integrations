// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Presentation mapping for the bpmn-js canvas surface.
 *
 * The colours and short labels mirror the canonical L3 view-model vocabulary
 * (`@francav/components` `AXIS_Y_ROWS` / `AXIS_X_ROWS`) so the diagram overlays read
 * the same as every other DPG surface. They are duplicated here rather than
 * imported at runtime because `@francav/components`' root entry pulls in the custom
 * elements (which require a DOM `HTMLElement`); the binding stays DOM-light and
 * usable from a bare diagram-js host, so it only takes a type-only dependency on
 * the view-model.
 */

import type {
  AxisXClassification,
  AxisYClassification,
  FindingSeverity,
} from "@francav/components";

export interface AxisYStyle {
  /** Border colour applied as the Axis-Y determinism ring. */
  color: string;
  /** Short label (matches the L3 matrix rows). */
  label: string;
  /** Human-readable name for tooltips/aria. */
  title: string;
}

export const AXIS_Y_STYLE: Readonly<Record<AxisYClassification, AxisYStyle>> = {
  fullyDeterministic: { color: "#22c55e", label: "FD", title: "Fully deterministic" },
  policyDependent: { color: "#eab308", label: "PD", title: "Policy dependent" },
  runtimeBound: { color: "#f97316", label: "RB", title: "Runtime bound" },
};

export type AxisXBadgeShape = "circle" | "square" | "triangle";

export interface AxisXStyle {
  color: string;
  label: string;
  title: string;
  /** Corner badge shape, or `null` when the class needs no badge. */
  shape: AxisXBadgeShape | null;
}

export const AXIS_X_STYLE: Readonly<Record<AxisXClassification, AxisXStyle>> = {
  selfContained: { color: "#9ca3af", label: "SC", title: "Self contained", shape: null },
  profileScoped: { color: "#3b82f6", label: "PS", title: "Profile scoped", shape: "circle" },
  engineSpecific: { color: "#a855f7", label: "ES", title: "Engine specific", shape: "square" },
  externalCoupled: { color: "#ef4444", label: "EC", title: "External coupled", shape: "triangle" },
};

export interface FindingStyle {
  color: string;
  title: string;
}

export const FINDING_STYLE: Readonly<Record<FindingSeverity, FindingStyle>> = {
  error: { color: "#ef4444", title: "Error" },
  warning: { color: "#eab308", title: "Warning" },
  info: { color: "#3b82f6", title: "Info" },
};

/** Rank used to pick the worst finding when several target one element. */
export const FINDING_SEVERITY_RANK: Readonly<Record<FindingSeverity, number>> = {
  error: 3,
  warning: 2,
  info: 1,
};
