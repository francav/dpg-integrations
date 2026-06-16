# DPG starter — quickstart

`dpg-starter` is the smallest working **Deterministic Process Governance (DPG)** integration. Copy
this package, point it at your own compiler output and BPMN, and you have governance rendering in
minutes. It ships two variants that share one framework-neutral core:

- **headless** — compiler result → governance report text. No DOM, no UI framework, no bpmn-js.
- **canvas** — the same analysis rendered as L3 panels plus bpmn-js overlays in the browser.

## Run it

```sh
git clone <this-repo>
cd dpg-integrations
npm install
npm run build
npm start --workspace dpg-starter   # prints a governance report for the bundled sample
```

`npm start` runs `dist/cli.js`, which analyses the bundled sample compiler result and prints a
report — proof the starter works end to end before you wire in your own data.

## Headless variant (~50 lines)

The whole headless integration is: take a compiler result, map it onto the view-model, render it.

```ts
import { mapCompilerResult } from "@francav/components";

// `compilerResult` is the output of @francav/compiler-node / @francav/compiler-browser.
// It is structurally @francav/compiler-core's CompilerResult, so it passes straight in.
const analysis = mapCompilerResult(compilerResult);

console.log(`Process: ${analysis.process.id}`);
console.log(`Runtime-bound elements: ${analysis.matrix.axisY.runtimeBound}`);
for (const f of analysis.findings) {
  console.log(`[${f.severity}] ${f.title} — ${f.recommendation}`);
}
```

The starter wraps exactly this in `src/headless.ts` (`analyze`, `renderReport`,
`reportFromCompilerResult`); `src/cli.ts` is the runnable entry. Swap `SAMPLE_COMPILER_RESULT`
(in `src/sample.ts`) for your real compiler output and you are done.

## Canvas variant

The canvas variant adds the L3 custom elements (`@francav/components`) and paints the analysis onto a
live bpmn-js canvas via `@francav/bpmn-js-adapter` — all from the same view-model.

```ts
import BpmnViewer from "bpmn-js/lib/NavigatedViewer.js";
import { mountCanvas } from "dpg-starter";
import { SAMPLE_BPMN, SAMPLE_COMPILER_RESULT } from "dpg-starter";

const viewer = new BpmnViewer({ container: "#canvas" });
await viewer.importXML(SAMPLE_BPMN);

// Reconcile compiler ids against the canvas, then mount panels + overlays.
const elements = viewer.get("elementRegistry").getAll();
const mounted = mountCanvas(viewer, document.querySelector("#panels"), SAMPLE_COMPILER_RESULT, {
  diagram: { elements },
});

// later, on a new analysis: mounted.update(nextAnalysis)
// on teardown:             mounted.destroy()
```

`bpmn-js` is an optional peer dependency — install it (`npm i bpmn-js`) only if you use the canvas
variant. The adapter binds through structural service typings, so it stays tolerant of the bpmn-js
version (>= 11).

## What to change

| You provide            | The starter shows where                    |
| ---------------------- | ------------------------------------------ |
| Your compiler result   | `src/sample.ts` → `SAMPLE_COMPILER_RESULT` |
| Your BPMN XML (canvas) | `src/sample.ts` → `SAMPLE_BPMN`            |
| How the report reads   | `src/headless.ts` → `renderReport`         |
| Which panels mount     | `src/canvas.ts` → `STARTER_PANEL_TAGS`     |

## License

[Apache-2.0](../../LICENSE). Copyright 2026 Victor França.
