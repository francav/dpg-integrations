// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Shared test fixtures: a tiny sample BPMN diagram and a matching analysis
 * view-model whose element ids line up with the diagram's shape ids.
 */

import type { AnalysisResult } from "@dpg/components";

/**
 * Minimal but real BPMN 2.0 with DI: start → service task → exclusive gateway →
 * (approve | reject) → end. Element ids are referenced by the view-model below.
 */
export const SAMPLE_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1" targetNamespace="http://dpg.dev/sample">
  <bpmn:process id="Process_1" isExecutable="true">
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
    <bpmndi:BPMNPlane id="Plane_1" bpmnElement="Process_1">
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

/** Element ids present in {@link SAMPLE_BPMN}, for assertions. */
export const SAMPLE_ELEMENT_IDS = {
  task: "Task_Score",
  gateway: "Gateway_Decide",
  end: "End_Approved",
} as const;

/** A view-model that classifies the sample's task + gateway and flags a finding. */
export const SAMPLE_ANALYSIS: AnalysisResult = {
  process: { id: "Process_1", name: "Loan decision" },
  summary: {
    maturitySignal: "fair",
    score: 62,
    structuralFindings: 0,
    semanticFindings: 1,
    contractCoverageRatio: 0.5,
    degradedFlags: ["runtime-bound"],
  },
  matrix: {
    axisY: { fullyDeterministic: 1, policyDependent: 0, runtimeBound: 1 },
    axisX: { selfContained: 1, profileScoped: 0, engineSpecific: 0, externalCoupled: 1 },
  },
  findings: [
    {
      id: "finding-1",
      elementId: SAMPLE_ELEMENT_IDS.task,
      severity: "warning",
      category: "runtime",
      title: "Undocumented service contract",
      message: "Service task calls an external system with no recorded contract.",
      policyId: "baseline-tier-2",
      recommendation: "Document the request/response contract for this service.",
    },
  ],
  determinismMap: {
    [SAMPLE_ELEMENT_IDS.task]: {
      axisY: "runtimeBound",
      axisX: "externalCoupled",
      rationale: "Outcome depends on an external scoring service.",
    },
    [SAMPLE_ELEMENT_IDS.gateway]: {
      axisY: "fullyDeterministic",
      axisX: "selfContained",
      rationale: "Exclusive gateway with exhaustive, non-overlapping conditions.",
    },
  },
  runtimeDependencyMap: {
    [SAMPLE_ELEMENT_IDS.task]: {
      contracts: [{ name: "scoring-api", type: "rest", owner: "risk", status: "undocumented" }],
    },
  },
  recommendations: [
    { id: "rec-1", severity: "medium", message: "Document the scoring service contract." },
  ],
};
