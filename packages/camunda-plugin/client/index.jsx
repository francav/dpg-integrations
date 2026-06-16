// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Camunda Desktop Modeler client-plugin entry — the wrapper that turns the
 * `dpg-camunda-plugin` *library* into a real drop-in Modeler plugin.
 *
 * The Modeler loads this file (referenced by the plugin's `index.js` →
 * `script`) into the renderer process. Here we:
 *  1. register the DPG bpmn-js marker module on every diagram-js instance
 *     (`registerDpgPlugin`), and
 *  2. register a client React component that adds a status-bar button which
 *     toggles an overlay. While open, the overlay hosts a LIVE governance
 *     session bound to the active diagram via `dpg-modeler`'s
 *     `startReferenceModeler`: it exports the active tab's BPMN, classifies it,
 *     mounts the L3 panels, paints Axis-Y rings / Axis-X badges / finding
 *     markers onto the canvas, and re-classifies on every edit.
 *
 * Why reuse `dpg-modeler` rather than mount panels here directly: the modeler
 * package already owns the edit→classify→render loop and a dependency-free
 * `sampleClassifier`. Reusing it keeps the Camunda plugin a thin host and keeps
 * the live behaviour identical across the reference modeler and this plugin.
 *
 * Analysis seam: `sampleClassifier` is a lightweight heuristic over the BPMN
 * XML, NOT the real DPG compiler. To ship real governance, swap it for a
 * classifier backed by `@dpg/compiler-browser` (same `(xml) => CompilerResult`
 * contract) — no other change here is needed.
 *
 * `camunda-modeler-plugin-helpers` (and its `/react` + `/components` subpaths)
 * are bundled in: their entries are thin shims that read host globals
 * (`window.react`, `window.components`) at runtime. The host's React is used
 * for the Fill/Overlay UI; the panels themselves are framework-neutral custom
 * elements, so there is no React-version coupling there.
 */

import { registerBpmnJSPlugin, registerClientPlugin } from "camunda-modeler-plugin-helpers";
import React, { PureComponent, Fragment } from "camunda-modeler-plugin-helpers/react";
import { Fill, Overlay } from "camunda-modeler-plugin-helpers/components";

// Import from the BUILT library output (tsc -b must run first) rather than the
// bare package name, so bundling does not depend on the workspace self-symlink.
import { registerDpgPlugin, PLUGIN_NAME } from "../dist/index.js";
import { startReferenceModeler, sampleClassifier } from "dpg-modeler";

// (1) Register the DPG bpmn-js module on every bpmn-js instance the Modeler
// creates. `registerDpgPlugin` only calls the helpers the host exposes.
registerDpgPlugin({ registerBpmnJSPlugin });

/**
 * (2) The client extension: a status-bar button that toggles a live governance
 * overlay for the active diagram.
 */
class DpgGovernance extends PureComponent {
  constructor(props) {
    super(props);
    this.state = { open: false };

    /** The active tab's bpmn-js Modeler instance (an EditorServices). */
    this._modeler = null;
    /** The overlay's panel container, while mounted. */
    this._container = null;
    /** The live reference-modeler session, while running. */
    this._session = null;

    this._buttonRef = React.createRef();

    // The Modeler emits this whenever a BPMN tab's bpmn-js instance is created
    // (open/switch tab). The instance exposes `.get('overlays'|'canvas'|
    // 'elementRegistry'|'eventBus')` and `.saveXML(...)` — exactly the
    // EditorServices contract startReferenceModeler needs. Rebind the session.
    props.subscribe("bpmn.modeler.created", (event) => {
      this._modeler = event.modeler;
      this._restart();
    });
  }

  componentWillUnmount() {
    this._teardown();
  }

  _toggle = () => {
    this.setState((s) => ({ open: !s.open }));
  };

  _close = () => {
    this.setState({ open: false });
  };

  /**
   * Callback ref on the overlay's container: start the live session when the
   * overlay's DOM mounts, tear it down when it unmounts.
   */
  _attachPanel = (container) => {
    this._container = container;
    if (container) {
      this._start();
    } else {
      this._teardown();
    }
  };

  _start() {
    if (this._session || !this._modeler || !this._container) return;
    this._session = startReferenceModeler(this._modeler, this._container, sampleClassifier, {
      onError: (error) => console.error("[DPG Governance] classification failed:", error),
    });
  }

  _teardown() {
    if (this._session) {
      this._session.destroy();
      this._session = null;
    }
  }

  /** Rebind to the current modeler if the overlay is open (e.g. tab switch). */
  _restart() {
    this._teardown();
    this._start();
  }

  render() {
    const { open } = this.state;
    return (
      <Fragment>
        <Fill slot="status-bar__file" group="9_dpg">
          <button
            type="button"
            className="btn"
            ref={this._buttonRef}
            title={`Toggle ${PLUGIN_NAME}`}
            onClick={this._toggle}
          >
            {PLUGIN_NAME}
          </button>
        </Fill>
        {open && this._buttonRef.current && (
          <Overlay
            anchor={this._buttonRef.current}
            onClose={this._close}
            minWidth={420}
            maxWidth={540}
          >
            <Overlay.Body>
              <div className="dpg-plugin-panel" ref={this._attachPanel} />
            </Overlay.Body>
          </Overlay>
        )}
      </Fragment>
    );
  }
}

registerClientPlugin(DpgGovernance, "client");
