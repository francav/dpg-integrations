// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * A rich sample BPMN 2.0 process (with full DI) that exercises every Axis-Y
 * class the compiler emits, so the visual harness is meaningful:
 *
 *  - `StartEvent_1`        — start event (boundary, no determinism content)
 *  - `Task_Score`          — serviceTask, camunda:type="external" → runtime-bound / externalized
 *  - `Task_Review`         — userTask → Non-Deterministic (human judgement)
 *  - `Task_Normalize`      — scriptTask → policy-dependent / engine-specific
 *  - `Gateway_Decide`      — exclusiveGateway with two CONDITIONED sequence flows
 *  - `Task_Notify`         — callActivity → Unknown (opaque sub-process)
 *  - `End_Approved` / `End_Rejected` — end events
 *
 * Element ids are stable so the harness can wire focus buttons to known ids.
 */
export const SAMPLE_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                  id="Definitions_Harness" targetNamespace="http://dpg.dev/visual-harness">
  <bpmn:process id="Process_LoanReview" name="Loan review" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Application received">
      <bpmn:outgoing>Flow_Start_Score</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:serviceTask id="Task_Score" name="Score applicant" camunda:type="external" camunda:topic="scoring">
      <bpmn:incoming>Flow_Start_Score</bpmn:incoming>
      <bpmn:outgoing>Flow_Score_Normalize</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:scriptTask id="Task_Normalize" name="Normalize score" scriptFormat="javascript">
      <bpmn:incoming>Flow_Score_Normalize</bpmn:incoming>
      <bpmn:outgoing>Flow_Normalize_Review</bpmn:outgoing>
      <bpmn:script>score = score / 100;</bpmn:script>
    </bpmn:scriptTask>
    <bpmn:userTask id="Task_Review" name="Manual underwriting review">
      <bpmn:incoming>Flow_Normalize_Review</bpmn:incoming>
      <bpmn:outgoing>Flow_Review_Decide</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:exclusiveGateway id="Gateway_Decide" name="Approved?">
      <bpmn:incoming>Flow_Review_Decide</bpmn:incoming>
      <bpmn:outgoing>Flow_Yes</bpmn:outgoing>
      <bpmn:outgoing>Flow_No</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:callActivity id="Task_Notify" name="Notify applicant" calledElement="NotifyProcess">
      <bpmn:incoming>Flow_Yes</bpmn:incoming>
      <bpmn:outgoing>Flow_Notify_End</bpmn:outgoing>
    </bpmn:callActivity>
    <bpmn:endEvent id="End_Approved" name="Approved">
      <bpmn:incoming>Flow_Notify_End</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="End_Rejected" name="Rejected">
      <bpmn:incoming>Flow_No</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_Start_Score" sourceRef="StartEvent_1" targetRef="Task_Score" />
    <bpmn:sequenceFlow id="Flow_Score_Normalize" sourceRef="Task_Score" targetRef="Task_Normalize" />
    <bpmn:sequenceFlow id="Flow_Normalize_Review" sourceRef="Task_Normalize" targetRef="Task_Review" />
    <bpmn:sequenceFlow id="Flow_Review_Decide" sourceRef="Task_Review" targetRef="Gateway_Decide" />
    <bpmn:sequenceFlow id="Flow_Yes" name="yes" sourceRef="Gateway_Decide" targetRef="Task_Notify">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\${score &gt;= 0.7}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_No" name="no" sourceRef="Gateway_Decide" targetRef="End_Rejected">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\${score &lt; 0.7}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_Notify_End" sourceRef="Task_Notify" targetRef="End_Approved" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_1">
    <bpmndi:BPMNPlane id="Plane_1" bpmnElement="Process_LoanReview">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="202" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="138" y="245" width="66" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Score_di" bpmnElement="Task_Score">
        <dc:Bounds x="240" y="180" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Normalize_di" bpmnElement="Task_Normalize">
        <dc:Bounds x="400" y="180" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Review_di" bpmnElement="Task_Review">
        <dc:Bounds x="560" y="180" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Decide_di" bpmnElement="Gateway_Decide" isMarkerVisible="true">
        <dc:Bounds x="725" y="195" width="50" height="50" />
        <bpmndi:BPMNLabel><dc:Bounds x="722" y="171" width="56" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Notify_di" bpmnElement="Task_Notify">
        <dc:Bounds x="840" y="100" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Approved_di" bpmnElement="End_Approved">
        <dc:Bounds x="1002" y="122" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="996" y="165" width="49" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Rejected_di" bpmnElement="End_Rejected">
        <dc:Bounds x="840" y="320" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="836" y="363" width="45" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Start_Score_di" bpmnElement="Flow_Start_Score">
        <di:waypoint x="188" y="220" /><di:waypoint x="240" y="220" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Score_Normalize_di" bpmnElement="Flow_Score_Normalize">
        <di:waypoint x="340" y="220" /><di:waypoint x="400" y="220" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Normalize_Review_di" bpmnElement="Flow_Normalize_Review">
        <di:waypoint x="500" y="220" /><di:waypoint x="560" y="220" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Review_Decide_di" bpmnElement="Flow_Review_Decide">
        <di:waypoint x="660" y="220" /><di:waypoint x="725" y="220" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Yes_di" bpmnElement="Flow_Yes">
        <di:waypoint x="750" y="195" /><di:waypoint x="750" y="140" /><di:waypoint x="840" y="140" />
        <bpmndi:BPMNLabel><dc:Bounds x="786" y="122" width="18" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_No_di" bpmnElement="Flow_No">
        <di:waypoint x="750" y="245" /><di:waypoint x="750" y="338" /><di:waypoint x="840" y="338" />
        <bpmndi:BPMNLabel><dc:Bounds x="788" y="320" width="15" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Notify_End_di" bpmnElement="Flow_Notify_End">
        <di:waypoint x="940" y="140" /><di:waypoint x="1002" y="140" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

/** Known element ids the harness wires focus buttons / labels to. */
export const SAMPLE_IDS = {
  userTask: "Task_Review",
  serviceTask: "Task_Score",
  callActivity: "Task_Notify",
} as const;
