// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * DEMO / FALLBACK fixtures — **not** real compiler output.
 *
 * These hand-authored sample inputs exist only so a fresh `git clone` →
 * `npm install` → `npm start` renders something immediately (the starter's
 * done-criterion) and so the starter's tests have a deterministic input. Real
 * output comes from the DPG compiler (`@dpg/compiler-browser` /
 * `@dpg/compiler-node`); a real consumer replaces these with their own compiler
 * result and their own BPMN XML. `canvas.ts` / `headless.ts` already accept any
 * `CompilerResultInput`, so swapping in real output requires no code change.
 */

import type { CompilerResultInput } from "@dpg/components";

/**
 * A compiler result, structurally `@dpg/compiler-core`'s `CompilerResult`.
 *
 * Models a tiny loan-decision process: a start event, an external scoring
 * service task (runtime-bound, externally coupled, undocumented contract) and an
 * exclusive gateway (fully deterministic, self-contained).
 */
export const SAMPLE_COMPILER_RESULT: CompilerResultInput = {
  metadata: { modelId: "Process_LoanDecision", degraded: false },
  structuralFindings: [],
  semanticFindings: [
    {
      id: "finding-undocumented-contract",
      category: "semantic",
      severity: "warning",
      message: "Service task calls an external scoring system with no recorded contract.",
      targetId: "Task_Score",
      policyClause: "baseline-tier-2/contract-coverage",
      ruleId: "contract-coverage",
      remediation: "Document the request/response contract for the scoring service.",
    },
  ],
  determinismMap: [
    {
      evaluationPointId: "Task_Score",
      axisY: "runtimeBound",
      axisX: "externalized",
      policyClause: "baseline-tier-2/axis-y",
      runtimeProfileSection: "service-tasks",
    },
    {
      evaluationPointId: "Gateway_Decide",
      axisY: "deterministic",
      axisX: "engineAgnostic",
      policyClause: "baseline-tier-2/axis-y",
    },
  ],
  runtimeDependencyMap: [
    {
      evaluationPointId: "Task_Score",
      dependency: "scoring-service",
      profileCoverage: "undocumented",
    },
  ],
  summary: {
    structuralErrors: 0,
    semanticErrors: 0,
    contractCoverageRatio: 0.5,
  },
};

/**
 * Minimal but real BPMN 2.0 (with DI) whose shape ids line up with the sample
 * compiler result above. Used by the canvas variant.
 */
export const SAMPLE_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1" targetNamespace="http://dpg.dev/sample">
  <bpmn:process id="Process_LoanDecision" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:serviceTask id="Task_Score" name="Score applicant">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:exclusiveGateway id="Gateway_Decide" name="Approved?">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_Yes</bpmn:outgoing>
      <bpmn:outgoing>Flow_No</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:endEvent id="End_Approved">
      <bpmn:incoming>Flow_Yes</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="End_Rejected">
      <bpmn:incoming>Flow_No</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_Score" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_Score" targetRef="Gateway_Decide" />
    <bpmn:sequenceFlow id="Flow_Yes" sourceRef="Gateway_Decide" targetRef="End_Approved" />
    <bpmn:sequenceFlow id="Flow_No" sourceRef="Gateway_Decide" targetRef="End_Rejected" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_1">
    <bpmndi:BPMNPlane id="Plane_1" bpmnElement="Process_LoanDecision">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="160" y="100" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Score_di" bpmnElement="Task_Score">
        <dc:Bounds x="250" y="78" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Decide_di" bpmnElement="Gateway_Decide" isMarkerVisible="true">
        <dc:Bounds x="405" y="93" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Approved_di" bpmnElement="End_Approved">
        <dc:Bounds x="512" y="40" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Rejected_di" bpmnElement="End_Rejected">
        <dc:Bounds x="512" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="196" y="118" /><di:waypoint x="250" y="118" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="350" y="118" /><di:waypoint x="405" y="118" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Yes_di" bpmnElement="Flow_Yes">
        <di:waypoint x="430" y="93" /><di:waypoint x="430" y="58" /><di:waypoint x="512" y="58" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_No_di" bpmnElement="Flow_No">
        <di:waypoint x="430" y="143" /><di:waypoint x="430" y="178" /><di:waypoint x="512" y="178" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

/** The canonical element ids present in {@link SAMPLE_BPMN}. */
export const SAMPLE_ELEMENT_IDS = ["StartEvent_1", "Task_Score", "Gateway_Decide"] as const;
