// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Self-contained sample so the reference modeler runs with zero external deps.
 *
 * Ships:
 *  - {@link SAMPLE_BPMN}: a minimal but real editable BPMN 2.0 process, and
 *  - {@link sampleClassifier}: a tiny, dependency-free {@link Classifier} that
 *    scans the BPMN XML and emits a compiler-shaped result.
 *
 * The sample classifier is intentionally a lightweight heuristic, NOT the real
 * `@dpg/compiler-*`: it exists so the modeler's edit→classify loop is observable
 * out of the box (and unit-testable) without wiring a compiler. A real
 * integration injects `@dpg/compiler-browser` in its place. The heuristic is
 * faithful enough to react to edits — adding an external service task adds a
 * runtime-bound, externally-coupled evaluation point and a missing-contract
 * finding; adding an exclusive gateway adds a deterministic, self-contained one.
 */

import type { CompilerDeterminismEntryInput, CompilerResultInput } from "@dpg/components";
import type { Classifier } from "./classify.js";

/** Minimal but real editable BPMN 2.0 (with DI): start → score → decide → ends. */
export const SAMPLE_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                  id="Definitions_1" targetNamespace="http://dpg.dev/sample">
  <bpmn:process id="Process_LoanDecision" name="Loan decision" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:serviceTask id="Task_Score" name="Score applicant" camunda:type="external" camunda:topic="scoring">
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

interface ScannedElement {
  id: string;
  tag: string;
  external: boolean;
  /** The element's `name` attribute, if any — used for human-facing messages. */
  name?: string;
}

/** Match an opening flow-node element, capturing its tag and `id` attribute. */
const ELEMENT_RE =
  /<(?:[\w-]+:)?(serviceTask|scriptTask|businessRuleTask|sendTask|exclusiveGateway|inclusiveGateway|parallelGateway)\b([^>]*)>/g;

const ID_RE = /\bid="([^"]+)"/;
const NAME_RE = /\bname="([^"]+)"/;

function scanProcess(xml: string): { processId: string; nodes: ScannedElement[] } {
  const processMatch = /<(?:[\w-]+:)?process\b([^>]*)>/.exec(xml);
  const processAttrs = processMatch?.[1] ?? "";
  const processId = ID_RE.exec(processAttrs)?.[1] ?? "Process";

  const nodes: ScannedElement[] = [];
  for (const match of xml.matchAll(ELEMENT_RE)) {
    const tag = match[1]!;
    const attrs = match[2] ?? "";
    const id = ID_RE.exec(attrs)?.[1];
    if (!id) continue;
    const external = /:type="external"/.test(attrs) || /\btype="external"/.test(attrs);
    const name = NAME_RE.exec(attrs)?.[1];
    nodes.push({ id, tag, external, name });
  }
  return { processId, nodes };
}

/**
 * A dependency-free classifier driving the modeler's edit→classify loop.
 *
 * Heuristics (deliberately simple — the real compiler does the rigorous work):
 *  - external service task → runtime-bound + externally-coupled + a
 *    missing-contract warning;
 *  - script task → policy-dependent + engine-specific;
 *  - any gateway / non-external task → fully-deterministic + self-contained.
 */
export const sampleClassifier: Classifier = (xml: string): CompilerResultInput => {
  const { processId, nodes } = scanProcess(xml);

  const determinismMap = nodes.map((node) => classifyNode(node));
  const semanticFindings = nodes
    .filter((node) => node.tag === "serviceTask" && node.external)
    .map((node) => ({
      id: `finding-contract-${node.id}`,
      category: "semantic" as const,
      severity: "warning" as const,
      message: `Service task "${node.name ?? node.id}" calls an external system with no recorded contract.`,
      targetId: node.id,
      policyClause: "baseline-tier-2/contract-coverage",
      ruleId: "contract-coverage",
      remediation: "Document the request/response contract for the external service.",
    }));

  const externalTasks = nodes.filter((n) => n.tag === "serviceTask" && n.external);
  const runtimeDependencyMap = externalTasks.map((node) => ({
    evaluationPointId: node.id,
    dependency: node.id,
    profileCoverage: "undocumented" as const,
  }));

  const documented = nodes.length - externalTasks.length;
  const contractCoverageRatio = nodes.length === 0 ? 1 : documented / nodes.length;

  return {
    metadata: { modelId: processId, degraded: false },
    structuralFindings: [],
    semanticFindings,
    determinismMap,
    runtimeDependencyMap,
    summary: {
      structuralErrors: 0,
      semanticErrors: 0,
      contractCoverageRatio,
    },
  };
};

function classifyNode(node: ScannedElement): CompilerDeterminismEntryInput {
  if (node.tag === "serviceTask" && node.external) {
    return {
      evaluationPointId: node.id,
      axisY: "runtimeBound",
      axisX: "externalized",
      policyClause: "baseline-tier-2/axis-y",
      runtimeProfileSection: "service-tasks",
    };
  }
  if (node.tag === "scriptTask") {
    return {
      evaluationPointId: node.id,
      axisY: "policyDependent",
      axisX: "engineSpecific",
      policyClause: "baseline-tier-2/axis-y",
      runtimeProfileSection: "scripts",
    };
  }
  return {
    evaluationPointId: node.id,
    axisY: "deterministic",
    axisX: "engineAgnostic",
    policyClause: "baseline-tier-2/axis-y",
  };
}
