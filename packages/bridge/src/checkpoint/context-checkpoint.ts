/**
 * context-checkpoint.ts — Builds a ContextCheckpoint across a bridge edge.
 *
 * A ContextCheckpoint snapshots relevant state from the source node
 * so the target node (and subsequent graph traversal) can access it
 * without re-running upstream nodes.
 *
 * Strategies (from HandoffContract.context_preservation):
 *   full    — entire source output is preserved
 *   partial — only the mapped target fields are preserved (default)
 *   none    — no context is preserved; target starts fresh
 *
 * SECURITY: context_checkpoint_json is a FORBIDDEN public key.
 * This object is only stored in trace events — never in public API responses.
 */

/** An immutable snapshot of context at a node boundary. */
export interface ContextCheckpoint {
  /** Node ID that produced the source output. */
  readonly source_node_id: string;
  /** Node ID that will consume the target input. */
  readonly target_node_id: string;
  /** Fields preserved from the source, keyed by field name. */
  readonly preserved_fields: Readonly<Record<string, unknown>>;
  /** Strategy used to determine which fields to preserve. */
  readonly strategy: "full" | "partial" | "none";
  /** ISO-8601 timestamp of checkpoint creation. */
  readonly created_at: string;
}

/**
 * Builds a ContextCheckpoint at a bridge edge boundary.
 *
 * @param sourceNodeId  - ID of the node that just executed.
 * @param targetNodeId  - ID of the node about to execute.
 * @param sourceOutput  - Full output from the source node.
 * @param mappedInput   - The bridge-mapped input for the target node.
 * @param strategy      - Preservation strategy from the handoff_contract.
 * @returns             Immutable ContextCheckpoint.
 */
export function buildContextCheckpoint(
  sourceNodeId: string,
  targetNodeId: string,
  sourceOutput: Record<string, unknown>,
  mappedInput:  Record<string, unknown>,
  strategy:     "full" | "partial" | "none"
): ContextCheckpoint {
  let preservedFields: Record<string, unknown>;

  switch (strategy) {
    case "full":
      // Entire source output is preserved
      preservedFields = { ...sourceOutput };
      break;

    case "partial":
      // Only the fields that were mapped to the target input are preserved
      preservedFields = { ...mappedInput };
      break;

    case "none":
    default:
      // No context carried over
      preservedFields = {};
      break;
  }

  return Object.freeze({
    source_node_id:   sourceNodeId,
    target_node_id:   targetNodeId,
    preserved_fields: Object.freeze(preservedFields),
    strategy,
    created_at:       new Date().toISOString(),
  }) as ContextCheckpoint;
}
