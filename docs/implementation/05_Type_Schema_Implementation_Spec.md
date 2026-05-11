# 05. Type & Schema Implementation Spec

## Required Schemas
TaskflowCXSchema, InputContractSchema, OutputContractSchema, RuntimeContractSchema, UISchemaSchema, CasePackMAOSchema, BridgeCasePackSchema, HandoffContractSchema, CasePackGraphSchema, DomainPackManifestSchema, AppObjectSchema, ValidationReportSchema, RuntimeTraceEventSchema, UsageEventSchema.

## Rules
TASKFLOW must include W_watchouts and O_output_contract. Output required_fields must exist in schema. Graph entry_node and final_nodes must reference existing nodes. App type must reference either casepack_key or graph_key. Pack primary_app_slug must resolve to assets.apps.
