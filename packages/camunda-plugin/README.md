# dpg-camunda-plugin

Brings **Deterministic Process Governance (DPG)** into the **Camunda Desktop Modeler**.

The package has two layers:

- **Library** (`src/`, built to `dist/`) — the thin shell: `registerDpgPlugin`,
  `DpgPanelHost`, and the plugin manifest. No governance logic of its own.
- **Modeler plugin wrapper** (`client/`, bundled to `dist/plugin/`) — the
  drop-in plugin the Camunda Desktop Modeler loads. It wires the library into
  the host via `camunda-modeler-plugin-helpers`.

## Build the drop-in plugin

```sh
# from the repo root
npm install
npm run build                       # builds the library (all packages)

# build the Modeler plugin bundle
npm run build:plugin -w dpg-camunda-plugin
```

This produces a self-contained plugin directory:

```
packages/camunda-plugin/dist/plugin/
  index.js       # plugin entry the Modeler discovers (plugins/<name>/index.js)
  client.js      # bundled renderer entry (~50 KB)
  style.css      # overlay layout
  package.json   # plugin metadata
```

The Modeler discovers a plugin by scanning for `plugins/*/index.js`; that
`index.js` points it at the renderer `script` (`client.js`) and `style`.

`camunda-modeler-plugin-helpers` and the host's React are **provided by the
Modeler at runtime** and are intentionally left out of the bundle.

## Install into the Camunda Desktop Modeler

Copy (or symlink) `dist/plugin/` into the Modeler's plugins directory, then
restart the Modeler. The Modeler discovers any directory containing a
`package.json` under its plugins paths:

| Platform | Plugins directory                                        |
| -------- | -------------------------------------------------------- |
| macOS    | `~/Library/Application Support/camunda-modeler/plugins/` |
| Windows  | `%APPDATA%\camunda-modeler\plugins\`                     |
| Linux    | `~/.config/camunda-modeler/plugins/`                     |

Example (macOS, symlink so rebuilds are picked up on the next restart):

```sh
ln -s "$(pwd)/packages/camunda-plugin/dist/plugin" \
  ~/Library/Application\ Support/camunda-modeler/plugins/dpg-governance
```

For local development you can also point the Modeler at any folder:

```sh
camunda-modeler --plugins=/abs/path/to/dpg-integrations/packages/camunda-plugin/dist/plugin
```

After restarting, open a BPMN diagram and click **DPG Governance** in the
status bar to toggle the governance overlay (determinism badge, matrix,
findings), with Axis-Y rings / Axis-X badges / finding markers painted onto the
canvas. The overlay analyses the **active diagram** and re-classifies live on
every edit.

## How analysis works

The overlay hosts a live session from the `dpg-modeler` package
(`startReferenceModeler`) bound to the active tab's bpmn-js instance: it exports
the current BPMN, classifies it, maps the result onto the view-model, and paints
the panels + canvas. The Camunda Modeler instance satisfies `dpg-modeler`'s
`EditorServices` contract (it exposes `overlays`/`canvas`/`elementRegistry`/
`eventBus` and `saveXML`), so no adapter is needed.

The plugin ships **no compiler**. Classification uses `dpg-modeler`'s
dependency-free `sampleClassifier` — a lightweight heuristic over the BPMN XML
(external service task → runtime-bound + missing-contract finding; gateway →
deterministic; etc.). To ship real governance, swap `sampleClassifier` in
`client/index.jsx` for a classifier backed by `@francav/compiler-browser` — it is
the same `(xml) => CompilerResult` contract, so nothing else changes.

## Caveats

- The host slot name (`status-bar__file`) and the `Overlay` component API track
  the Camunda Modeler version. They follow the current plugin SDK; confirm
  against the Modeler release you target.
- This wrapper is validated by build + bundle and by the package's unit tests
  (`npm test -w dpg-camunda-plugin`), **not** by launching the Modeler GUI.
