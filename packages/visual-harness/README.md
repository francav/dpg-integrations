<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- Copyright 2026 Victor França -->

# dpg-visual-harness

A standalone, **browser-runnable** Vite page for manually validating
[`@francav/bpmn-js-adapter`](../bpmn-js-adapter) (the canvas overlay + selection
layer) and [`dpg-modeler`](../modeler) (the live `startReferenceModeler`
edit→classify→render loop). These two libraries have unit tests but no visual
demo; this harness lets a human open a browser and **see** them work.

It is a private workspace member (never published). It consumes the workspace
packages (`@francav/bpmn-js-adapter`, `dpg-modeler`) plus the published
`@francav/components` / `@francav/compiler-browser` and `bpmn-js` from npm.

## Run it

```sh
cd packages/visual-harness
npm run dev
# open the printed URL, typically http://localhost:5173
```

(`npm run build` produces a production bundle in `dist/`, used in CI to prove
everything resolves and type-checks under a real browser bundler.)

## What each section validates

### Section A — bpmn-js-adapter (read-only canvas decoration)

A read-only bpmn-js `NavigatedViewer` imports the sample BPMN. The harness
compiles it once via `compileModelInBrowser({ modelId, bpmnXml })`, maps it with
`mapCompilerResult(result, diagramIndex)`, then constructs a `DpgCanvasBinding`
from the viewer's services and calls `.apply()` so the governance decoration
appears **on the canvas**:

- an **Axis-Y determinism ring** per classified element,
- an **Axis-X coupling badge**, and
- a per-element **finding marker** (worst severity).

Three buttons call `DpgCanvasSelection.focusElement(id)` for known elements
(user task, service task, call activity) to demonstrate panel→canvas
select + pan. The canvas→panel direction is shown via the
`onCanvasSelect` log at the bottom of the section (click a shape, watch the id).

### Section B — dpg-modeler (live governance modeler)

An editable bpmn-js `Modeler` imports the same sample and is driven by
`startReferenceModeler(modeler, panelContainer, createCompilerClassifier(), …)`.
The consolidated `dpg-governance-inspector` renders beside the canvas. Analysis
runs on load; editing re-classifies; clicking a finding or matrix dot selects on
the canvas; changing the profile/policy dropdown re-runs the analysis.

## Checklist — what to look for

Section A (overlays on the read-only canvas):

- [ ] **Service task** "Score applicant" (`camunda:type="external"`) shows the
      **runtime-bound** ring + externalized badge + a missing-contract finding marker.
- [ ] **User task** "Manual underwriting review" shows the **Non-Deterministic**
      ring (crimson, `#7f1d1d`).
- [ ] **Call activity** "Notify applicant" shows the **Unknown** ring (grey, `#6b7280`).
- [ ] **Script task** "Normalize score" shows the **policy-dependent** ring (amber).
- [ ] The exclusive gateway / deterministic nodes show the **fully-deterministic** ring (green).
- [ ] Clicking **Focus …** buttons selects + pans to that element (panel→canvas).
- [ ] Clicking a shape on the canvas logs its id in the selection log (canvas→panel).

Section B (live modeler):

- [ ] The inspector populates on load (badge, matrix, findings, selector) — not "No analysis".
- [ ] The matrix surfaces all five Axis-Y classes distinctly (the human task reads
      **Non-Deterministic**, the call activity **Unknown** — not collapsed to Runtime-Bound).
- [ ] **Edit** the diagram (e.g. delete the service task or add a task) → panels and
      canvas overlays re-classify within ~150ms.
- [ ] Clicking a **finding** or **matrix dot** focuses the element on the canvas.
- [ ] Changing the **profile** or **policy** dropdown re-runs the analysis.

## bpmn-js / CSS notes

- Built against **bpmn-js 18** (`new Modeler` / `new NavigatedViewer` from
  `bpmn-js/lib/*`). Both satisfy the adapter's structural `DiagramServices` /
  `EditorServices` via their `get(serviceName)` locator — no bpmn-js import in
  the libraries themselves.
- Three CSS files are required for the canvas to render shapes and the BPMN
  icon font: `bpmn-js/dist/assets/diagram-js.css`,
  `bpmn-js/dist/assets/bpmn-js.css`, and
  `bpmn-js/dist/assets/bpmn-font/css/bpmn.css`. Omitting the font CSS leaves
  task/event glyphs unrendered.
- The adapter overlay stylesheet (`dpgStylesheet()`) is injected once into
  `<head>` so the Axis-Y rings / Axis-X badges / finding markers are styled.
  The `@francav/components` panels are custom elements that carry their own
  styles in shadow DOM (injected by `mountGovernancePanels`), so no extra
  component stylesheet import is needed.
