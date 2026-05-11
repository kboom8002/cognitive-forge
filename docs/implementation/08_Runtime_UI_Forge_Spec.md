# 08. Runtime & UI Forge Spec

Runtime flow: create run -> validate input -> build execution plan -> call AIProviderAdapter -> parse output -> validate output -> repair -> fallback -> write trace/usage -> sanitize public output.

BridgeRunner validates source_output, executes mapping_rules, applies defaults, validates target_input, builds context_checkpoint, and writes handoff_event.

SequentialGraphRunner validates graph, creates graph_run, executes nodes and bridge edges, writes node_runs and handoff_events, validates final output, and writes usage.

UI Forge: DynamicForm renders input_contract and ui_schema. OutputCard renders output_contract. CompositeAppRenderer renders graph apps. Public mode hides internals.
