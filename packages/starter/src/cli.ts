#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Runnable starter entry: `npm start` (or `node dist/cli.js`) renders a DPG
 * governance report for the bundled sample compiler result. This is what makes
 * the starter's done-criterion — `git clone` → install → runs → renders — true
 * out of the box, with no external services or files required.
 */

import { reportFromCompilerResult } from "./headless.js";
import { SAMPLE_COMPILER_RESULT } from "./sample.js";

const report = reportFromCompilerResult(SAMPLE_COMPILER_RESULT);
process.stdout.write(report + "\n");
