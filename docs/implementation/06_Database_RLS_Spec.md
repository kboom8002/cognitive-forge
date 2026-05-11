# 06. Database & RLS Spec

## Tables
workspaces, workspace_members, casepacks, casepack_versions, domain_packs, domain_pack_versions, domain_pack_assets, domain_pack_installs, apps, casepack_graphs, graph_versions, casepack_runs, graph_runs, node_runs, handoff_events, runtime_trace_events, usage_events, validation_results.

## RLS
Enable RLS on workspace-scoped tables. Add is_workspace_member and has_workspace_role. Public endpoints may expose only safe metadata, contracts, safe UI schema, trust badges, progress, and final output.

Forbidden public keys: casepack_json, manifest_json, graph_json, taskflow_cx, K_REF, runtime_contract, model_policy, bridge_output_json, source_output_json, target_input_json, context_checkpoint_json, trace_payload, repair_attempts, execution_plan.
