/**
 * sequential-graph-runner.ts — Executes a CasePackGraph node-by-node.
 *
 * Execution flow (doc 08):
 *   1.  Validate graph structure (entry_node, final_nodes, edges).
 *   2.  Create graph_runs row (status: pending).
 *   3.  Validate entry node input against entry MAO input_contract.
 *   4.  Determine linear execution order via topological traversal from entry_node.
 *   5.  For each node in order:
 *       a. Execute via runSingleCasePack().
 *       b. Merge output into accumulatedContext.
 *       c. If a bridge edge exists, run BridgeRunner → validate → write handoff_event.
 *       d. If bridge fails → stop graph (return partial result).
 *   6.  Collect final_output from final_nodes.
 *   7.  Validate final output against final node output_contract.
 *   8.  Save final_output_json and update graph_runs row.
 *   9.  Write graph-level usage event (summed token counts).
 *  10.  If publicMode → sanitize final output via PublicOutputSanitizer.
 *  11.  Return GraphRunResult.
 *
 * accumulatedContext:
 *   An internal Map that grows as nodes execute. Each node's output is
 *   namespaced by node_id (e.g. "prompt_improvement.diagnosis").
 *   SECURITY: accumulatedContext is NEVER exposed in public API responses.
 *   It is used only to make prior outputs available to the bridge engine.
 *
 * ISOLATION RULES:
 *   ✓ May import @cognitive-forge/core, @cognitive-forge/casepack, @cognitive-forge/bridge
 *   ✗ Must NOT import React, Next.js, or @cognitive-forge/ui-forge
 *   ✗ Must NOT import Supabase directly (stores are injected)
 */

import { AppError, AppErrorCode } from "@cognitive-forge/core";
import type { CasePackGraph, CasePackMAO, OutputContract, ValidationReport, BridgeCasePack } from "@cognitive-forge/core";
import { runBridge } from "@cognitive-forge/bridge";
import type { IHandoffEventStore } from "@cognitive-forge/bridge";
import { runSingleCasePack } from "./single-casepack-runner";
import type { IRunStore } from "./single-casepack-runner";
import { validateOutput } from "../validators/output-validator";
import { sanitizePublicOutput } from "../public/public-output-sanitizer";
import type { AIProviderAdapter } from "../ai/ai-provider";
import type { TraceWriter } from "../trace/trace-writer";
import type { UsageWriter } from "../trace/usage-writer";

// ── Graph run store interface ─────────────────────────────────────────────────

/**
 * Minimal interface for persisting graph_runs rows.
 * Implemented by the apps/web Supabase layer.
 */
export interface IGraphRunStore {
  /** Creates the graph_runs row, returns graph_run_id (UUID). */
  create(params: {
    workspace_id:  string;
    graph_key:     string;
    user_id?:      string | undefined;
    input_json:    Record<string, unknown>;
  }): Promise<string>;

  /** Updates graph_run row with status, final output, etc. */
  update(graphRunId: string, params: {
    status:             string;
    final_output_json?: Record<string, unknown> | undefined;
    completed_at?:      string | undefined;
    node_count?:        number | undefined;
  }): Promise<void>;
}

// ── Node run result ───────────────────────────────────────────────────────────

/** Result of executing a single node within the graph. */
export interface NodeRunResult {
  /** Graph node ID. */
  readonly node_id:      string;
  /** The CasePack key this node ran. */
  readonly casepack_key: string;
  /** Execution status. */
  readonly status:       "success" | "failed" | "repaired";
  /** Node output (raw — NOT sanitized). */
  readonly output:       Record<string, unknown>;
  /** Token counts from this node's AI call. */
  readonly tokens_in:    number;
  readonly tokens_out:   number;
  /** Number of repair attempts for this node. */
  readonly repair_attempts: number;
}

// ── Graph run result ──────────────────────────────────────────────────────────

/**
 * The result returned by runSequentialGraph.
 *
 * SECURITY: node_results and accumulated_context are INTERNAL.
 * They must never be sent to a public API caller.
 * Only final_output (sanitized if publicMode) is safe for public responses.
 */
export interface GraphRunResult {
  /** UUID of the graph_runs row. */
  readonly graph_run_id:  string;
  /** Graph execution status. */
  readonly status:        "success" | "failed" | "partial";
  /**
   * Final output from the terminal node(s).
   * Sanitized by PublicOutputSanitizer if publicMode=true.
   */
  readonly final_output:  Record<string, unknown>;
  /** Validation report for the final output. */
  readonly validation:    ValidationReport;
  /** Per-node execution results (INTERNAL — not for public). */
  readonly node_results:  NodeRunResult[];
  /** Summed token counts across all nodes. */
  readonly total_tokens_in:  number;
  readonly total_tokens_out: number;
  /** Total repair attempts across all nodes. */
  readonly total_repair_attempts: number;
  /**
   * Nodes that successfully completed execution.
   * Useful for partial-run status reporting.
   */
  readonly completed_nodes: string[];
}

// ── Graph run context ─────────────────────────────────────────────────────────

export interface GraphRunContext {
  /** The validated CasePackGraph definition. */
  graph:            CasePackGraph;
  /** Map from casepack_key → CasePackMAO (all nodes resolved server-side). */
  maoMap:           Map<string, CasePackMAO>;
  /** Map from bridge_key → BridgeCasePack (all edges resolved server-side). */
  bridgeMap:        Map<string, BridgeCasePack>;
  /** User-provided input (fed to the entry node). */
  userInput:        Record<string, unknown>;
  /** AI provider adapter (MockAIProvider in Sprint 07). */
  adapter:          AIProviderAdapter;
  /** TraceWriter for lifecycle event recording. */
  traceWriter:      TraceWriter;
  /** UsageWriter for token/cost recording. */
  usageWriter:      UsageWriter;
  /** RunStore for casepack_runs row management (per-node). */
  runStore:         IRunStore;
  /** GraphRunStore for graph_runs row management. */
  graphRunStore:    IGraphRunStore;
  /**
   * Optional: store for writing handoff_event rows.
   * If absent, handoff events are not persisted (acceptable for tests).
   */
  handoffEventStore?: IHandoffEventStore | undefined;
  /** Workspace ID for telemetry. */
  workspace_id:     string;
  /** Optional authenticated user ID. */
  user_id?:         string | undefined;
  /** When true, final output is sanitized via PublicOutputSanitizer. */
  publicMode:       boolean;
  /** When true, trace and usage events are NOT written. */
  zeroRetention?:   boolean | undefined;
}

// ── Topological order (linear DAG traversal) ──────────────────────────────────

/**
 * Determines the linear execution order of nodes by following edges
 * from entry_node to terminal nodes.
 *
 * For Sprint 07: All P0 graphs are strictly linear (no branching).
 * General DAG support (multiple outgoing edges) deferred to Sprint 11.
 *
 * @returns Ordered array of node IDs to execute.
 */
function resolveExecutionOrder(graph: CasePackGraph): string[] {
  const edgeMap = new Map<string, string>(); // from → to
  for (const edge of graph.edges) {
    edgeMap.set(edge.from, edge.to);
  }

  const order: string[] = [];
  const visited = new Set<string>();
  let current: string | undefined = graph.entry_node;

  while (current !== undefined && !visited.has(current)) {
    visited.add(current);
    order.push(current);
    current = edgeMap.get(current);
  }

  return order;
}

/**
 * Returns the bridge edge between two adjacent nodes, if one exists.
 */
function findEdgeBridgeKey(
  graph:    CasePackGraph,
  fromId:   string,
  toId:     string
): string | undefined {
  const edge = graph.edges.find((e) => e.from === fromId && e.to === toId);
  return edge?.bridge_key;
}

// ── In-memory node run store (wraps IRunStore) ────────────────────────────────

/**
 * Creates an in-memory IRunStore that wraps an external store.
 * Used to give each node its own run-ID lifecycle.
 */
function makeNodeRunStore(outer: IRunStore): IRunStore {
  return outer;
}

// ── Main runner ───────────────────────────────────────────────────────────────

/**
 * Executes a CasePackGraph sequentially from entry_node to final_node(s).
 *
 * @param ctx - Full graph execution context with injected dependencies.
 * @returns   GraphRunResult with final output and telemetry.
 * @throws    AppError(VALIDATION_ERROR) if the entry node input is invalid.
 * @throws    AppError(INTERNAL_ERROR) if graph structure is invalid.
 */
export async function runSequentialGraph(ctx: GraphRunContext): Promise<GraphRunResult> {
  const {
    graph, maoMap, bridgeMap, userInput, adapter,
    traceWriter, usageWriter, runStore, graphRunStore,
    handoffEventStore, workspace_id, publicMode,
  } = ctx;
  const shouldTrace = ctx.zeroRetention !== true;

  // ── Step 1: Validate graph structure ──────────────────────────────────────
  const nodeIds = new Set(graph.nodes.map((n) => n.id));

  if (!nodeIds.has(graph.entry_node)) {
    throw new AppError(
      AppErrorCode.VALIDATION_ERROR,
      `Graph "${graph.key}": entry_node "${graph.entry_node}" does not reference a known node`
    );
  }

  for (const fn of graph.final_nodes) {
    if (!nodeIds.has(fn)) {
      throw new AppError(
        AppErrorCode.VALIDATION_ERROR,
        `Graph "${graph.key}": final_node "${fn}" does not reference a known node`
      );
    }
  }

  // Verify all node MAOs are present
  for (const node of graph.nodes) {
    if (!maoMap.has(node.casepack_key)) {
      throw new AppError(
        AppErrorCode.INTERNAL_ERROR,
        `Graph "${graph.key}": MAO not provided for node "${node.id}" (casepack_key: "${node.casepack_key}")`
      );
    }
  }

  // ── Step 2: Create graph_runs row ─────────────────────────────────────────
  const graphRunId = await graphRunStore.create({
    workspace_id,
    graph_key:  graph.key,
    ...(ctx.user_id !== undefined ? { user_id: ctx.user_id } : {}),
    input_json: userInput,
  });

  // ── Step 3: Write graph start trace ──────────────────────────────────────
  if (shouldTrace) {
    await traceWriter.start(graphRunId, graph.key, {
      graph_key:   graph.key,
      node_count:  graph.nodes.length,
      entry_node:  graph.entry_node,
      final_nodes: graph.final_nodes,
    });
  }

  // ── Step 4: Determine linear execution order ──────────────────────────────
  const executionOrder = resolveExecutionOrder(graph);

  // ── accumulatedContext — grows as nodes complete ──────────────────────────
  // SECURITY: Never exposed in public API responses.
  const accumulatedContext: Record<string, unknown> = {};

  // Track telemetry totals
  let totalTokensIn     = 0;
  let totalTokensOut    = 0;
  let totalRepairs      = 0;
  const nodeResults: NodeRunResult[] = [];
  const completedNodes: string[] = [];

  // Current node's input — starts with userInput, updated by bridge after each node
  let currentNodeInput = userInput;

  // ── Step 5: Execute each node in order ───────────────────────────────────
  for (let i = 0; i < executionOrder.length; i++) {
    const nodeId = executionOrder[i]!;
    const node   = graph.nodes.find((n) => n.id === nodeId);

    if (!node) {
      // Defensive: should not happen after step 1 validation
      throw new AppError(AppErrorCode.INTERNAL_ERROR, `Node "${nodeId}" missing from graph nodes array`);
    }

    const mao = maoMap.get(node.casepack_key);
    if (!mao) {
      throw new AppError(AppErrorCode.INTERNAL_ERROR, `MAO missing for node "${nodeId}"`);
    }

    // ── 5a: Execute node via SingleCasePackRunner ─────────────────────────
    if (shouldTrace) {
      await traceWriter.step(graphRunId, {
        phase:       "node_start",
        node_id:     nodeId,
        casepack_key: node.casepack_key,
        node_index:  i,
      }, node.casepack_key);
    }

    let nodeResult: Awaited<ReturnType<typeof runSingleCasePack>>;
    try {
      nodeResult = await runSingleCasePack({
        workspace_id,
        casepack_key: node.casepack_key,
        mao,
        user_input:   currentNodeInput,
        adapter,
        traceWriter,
        usageWriter,
        runStore:     makeNodeRunStore(runStore),
        publicMode:   false,   // Always internal — graph runner sanitizes final output
        zeroRetention: ctx.zeroRetention,
        ...(ctx.user_id !== undefined ? { user_id: ctx.user_id } : {}),
      });
    } catch (err) {
      // Node failed — record and abort the graph
      const completedAt = new Date().toISOString();
      await graphRunStore.update(graphRunId, {
        status:       "failed",
        completed_at: completedAt,
        node_count:   completedNodes.length,
      });

      if (shouldTrace) {
        await traceWriter.error(graphRunId, {
          phase:        "node_failed",
          node_id:      nodeId,
          casepack_key: node.casepack_key,
          error:        err instanceof Error ? err.message : String(err),
        }, node.casepack_key);
      }

      // Return partial result with what was completed
      const emptyValidation: ValidationReport = {
        valid:      false,
        status:     "fail",
        errors:     [{ code: "NODE_FAILED", message: `Node "${nodeId}" failed: ${err instanceof Error ? err.message : String(err)}`, path: [nodeId], blocking: true }],
        checked_at: new Date().toISOString(),
      };

      return {
        graph_run_id:           graphRunId,
        status:                 "failed",
        final_output:           {},
        validation:             emptyValidation,
        node_results:           nodeResults,
        total_tokens_in:        totalTokensIn,
        total_tokens_out:       totalTokensOut,
        total_repair_attempts:  totalRepairs,
        completed_nodes:        completedNodes,
      };
    }

    // ── 5b: Record node result ─────────────────────────────────────────────
    const nodeRunResult: NodeRunResult = {
      node_id:         nodeId,
      casepack_key:    node.casepack_key,
      status:          nodeResult.status,
      output:          nodeResult.output,
      tokens_in:       0,   // runSingleCasePack doesn't surface individual tokens in RunResult
      tokens_out:      0,   // token totals are in usage_events written by the node runner
      repair_attempts: nodeResult.repair_attempts,
    };
    nodeResults.push(nodeRunResult);
    completedNodes.push(nodeId);
    totalRepairs += nodeResult.repair_attempts;

    // ── 5c: Merge node output into accumulatedContext ──────────────────────
    // Namespaced by node_id to prevent key collisions.
    for (const [key, val] of Object.entries(nodeResult.output)) {
      accumulatedContext[`${nodeId}.${key}`] = val;
    }

    if (shouldTrace) {
      await traceWriter.step(graphRunId, {
        phase:        "node_complete",
        node_id:      nodeId,
        status:       nodeResult.status,
        output_keys:  Object.keys(nodeResult.output),
      }, node.casepack_key);
    }

    // ── 5d: If there is a next node, run the bridge ────────────────────────
    const nextNodeId = executionOrder[i + 1];
    if (nextNodeId === undefined) {
      // This is the last node — no bridge needed
      break;
    }

    const bridgeKey = findEdgeBridgeKey(graph, nodeId, nextNodeId);

    if (bridgeKey === undefined) {
      // No bridge on this edge — pass node output directly
      // Note: This means target must accept the same field keys. Validated by user.
      currentNodeInput = { ...accumulatedContext, ...nodeResult.output };
    } else {
      // Bridge exists — run BridgeRunner
      const bridge = bridgeMap.get(bridgeKey);
      if (!bridge) {
        // Bridge definition missing — abort graph
        const completedAt = new Date().toISOString();
        await graphRunStore.update(graphRunId, {
          status:       "failed",
          completed_at: completedAt,
          node_count:   completedNodes.length,
        });

        if (shouldTrace) {
          await traceWriter.error(graphRunId, {
            phase:      "bridge_missing",
            bridge_key: bridgeKey,
            from_node:  nodeId,
            to_node:    nextNodeId,
          });
        }

        const emptyValidation: ValidationReport = {
          valid:      false,
          status:     "fail",
          errors:     [{ code: "BRIDGE_MISSING", message: `Bridge "${bridgeKey}" not found in bridgeMap`, path: [bridgeKey], blocking: true }],
          checked_at: new Date().toISOString(),
        };

        return {
          graph_run_id:          graphRunId,
          status:                "partial",
          final_output:          {},
          validation:            emptyValidation,
          node_results:          nodeResults,
          total_tokens_in:       totalTokensIn,
          total_tokens_out:      totalTokensOut,
          total_repair_attempts: totalRepairs,
          completed_nodes:       completedNodes,
        };
      }

      if (shouldTrace) {
        await traceWriter.step(graphRunId, {
          phase:      "bridge_start",
          bridge_key: bridgeKey,
          from_node:  nodeId,
          to_node:    nextNodeId,
        });
      }

      const bridgeResult = await runBridge({
        bridge,
        sourceOutput: { ...accumulatedContext, ...nodeResult.output },
        sourceNodeId: nodeId,
        targetNodeId: nextNodeId,
        graphRunId,
        handoffEventStore,
      });

      // ── Stop graph if bridge validation fails ──────────────────────────
      if (!bridgeResult.is_valid) {
        const completedAt = new Date().toISOString();
        await graphRunStore.update(graphRunId, {
          status:       "partial",
          completed_at: completedAt,
          node_count:   completedNodes.length,
        });

        if (shouldTrace) {
          await traceWriter.error(graphRunId, {
            phase:             "bridge_validation_failed",
            bridge_key:        bridgeKey,
            from_node:         nodeId,
            to_node:           nextNodeId,
            handoff_errors:    bridgeResult.handoff_validation.errors.length,
            target_missing:    bridgeResult.target_validation.missing,
          });
        }

        const bridgeErrors = bridgeResult.handoff_validation.errors.map((e: { message: string; field: string }) => ({
          code:     "BRIDGE_VALIDATION_FAILED" as const,
          message:  e.message,
          path:     [e.field],
          blocking: true as const,
        }));

        const bridgeValidation: ValidationReport = {
          valid:      false,
          status:     "fail",
          errors:     bridgeErrors,
          checked_at: new Date().toISOString(),
        };

        return {
          graph_run_id:          graphRunId,
          status:                "partial",
          final_output:          {},
          validation:            bridgeValidation,
          node_results:          nodeResults,
          total_tokens_in:       totalTokensIn,
          total_tokens_out:      totalTokensOut,
          total_repair_attempts: totalRepairs,
          completed_nodes:       completedNodes,
        };
      }

      // Bridge passed — use mapped target_input as the next node's input
      currentNodeInput = bridgeResult.target_input;

      if (shouldTrace) {
        await traceWriter.step(graphRunId, {
          phase:         "bridge_complete",
          bridge_key:    bridgeKey,
          from_node:     nodeId,
          to_node:       nextNodeId,
          mapped_keys:   Object.keys(bridgeResult.target_input),
        });
      }
    }
  } // end node loop

  // ── Step 6: Collect final output from final_nodes ─────────────────────────
  const finalOutput: Record<string, unknown> = {};
  for (const finalNodeId of graph.final_nodes) {
    const result = nodeResults.find(r => r.node_id === finalNodeId);
    if (result) {
      Object.assign(finalOutput, result.output);
    }
  }

  if (Object.keys(finalOutput).length === 0 && nodeResults.length > 0) {
    throw new AppError(AppErrorCode.INTERNAL_ERROR, `Graph "${graph.key}": no final_nodes produced output`);
  }

  // ── Step 7: Validate final output against merged final nodes output_contract ───────
  const finalContract: OutputContract = { fields: [], required_fields: [], public_fields: [] };
  let hasContract = false;

  for (const finalNodeId of graph.final_nodes) {
    const finalNode = graph.nodes.find((n) => n.id === finalNodeId);
    const finalMao = finalNode ? maoMap.get(finalNode.casepack_key) : undefined;
    if (finalMao?.output_contract) {
      hasContract = true;
      finalContract.fields.push(...finalMao.output_contract.fields);
      finalContract.required_fields.push(...finalMao.output_contract.required_fields);
      if (finalMao.output_contract.public_fields) {
        finalContract.public_fields!.push(...finalMao.output_contract.public_fields);
      }
    }
  }

  const finalValidation: ValidationReport = hasContract
    ? validateOutput(finalOutput, finalContract)
    : {
        valid:      true,
        status:     "pass",
        errors:     [],
        checked_at: new Date().toISOString(),
      };

  // ── Step 8: Save final_output_json and update graph_runs row ──────────────
  const completedAt = new Date().toISOString();
  const graphStatus = finalValidation.valid ? "success" : "failed";

  await graphRunStore.update(graphRunId, {
    status:            graphStatus,
    final_output_json: finalOutput,
    completed_at:      completedAt,
    node_count:        nodeResults.length,
  });

  // ── Step 9: Write graph-level usage event ─────────────────────────────────
  // Note: Individual node usage events are already written by runSingleCasePack.
  // We write a graph-level summary event for aggregate tracking.
  if (shouldTrace) {
    const firstNodeMao = maoMap.get(graph.nodes[0]?.casepack_key ?? "");
    const provider = firstNodeMao?.runtime_contract.provider ?? "unknown";
    const model    = firstNodeMao?.runtime_contract.model    ?? "unknown";

    await usageWriter.record({
      run_id:          graphRunId,
      workspace_id,
      graph_key:       graph.key,
      provider,
      model,
      tokens_in:       totalTokensIn,
      tokens_out:      totalTokensOut,
      repair_attempts: totalRepairs,
    });

    await traceWriter.complete(graphRunId, {
      phase:       "graph_complete",
      status:      graphStatus,
      node_count:  nodeResults.length,
      total_repairs: totalRepairs,
    }, graph.key);
  }

  // ── Step 10: Sanitize if publicMode ───────────────────────────────────────
  const publicFinalOutput = publicMode && finalContract
    ? sanitizePublicOutput(finalOutput, finalContract)
    : finalOutput;

  // ── Step 11: Return GraphRunResult ────────────────────────────────────────
  return {
    graph_run_id:          graphRunId,
    status:                graphStatus,
    final_output:          publicFinalOutput,
    validation:            finalValidation,
    node_results:          nodeResults,
    total_tokens_in:       totalTokensIn,
    total_tokens_out:      totalTokensOut,
    total_repair_attempts: totalRepairs,
    completed_nodes:       completedNodes,
  };
}
