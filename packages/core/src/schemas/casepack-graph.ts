/**
 * CasePackGraphSchema — a directed acyclic graph of CasePacks.
 *
 * A CasePack Graph wires multiple CasePack nodes together via edges
 * (optionally bridged by BridgeCasePacks). It is executed by the
 * SequentialGraphRunner in packages/runtime.
 *
 * CROSS-REFERENCE RULES (doc 05):
 * 1. entry_node must reference an existing node id.
 * 2. All final_nodes must reference existing node ids.
 * 3. All edge source/target ids must reference existing node ids.
 * All enforced via superRefine.
 *
 * ISOLATION: graph_json is a FORBIDDEN public key.
 */

import { z } from "zod";
import {
  GraphKeySchema,
  CasePackKeySchema,
  BridgeKeySchema,
  SemVerSchema,
  PackStatusSchema,
  ISODateTimeSchema,
} from "./primitives";

// ── Node ──────────────────────────────────────────────────────────────────────

export const GraphNodeSchema = z.object({
  /**
   * Unique node identifier within the graph.
   * Must be lowercase snake_case.
   */
  id: z
    .string()
    .min(1)
    .regex(/^[a-z_][a-z0-9_]*$/, {
      message: "Node id must be lowercase snake_case",
    }),

  /** The CasePack this node executes. */
  casepack_key: CasePackKeySchema,

  /** Optional human-readable label. */
  label: z.string().optional(),

  /** Position hint for visual graph editors (optional). */
  position: z
    .object({ x: z.number(), y: z.number() })
    .optional(),
});

// ── Edge ──────────────────────────────────────────────────────────────────────

export const GraphEdgeSchema = z.object({
  /** Source node id. */
  from: z.string().min(1),

  /** Target node id. */
  to: z.string().min(1),

  /**
   * Optional BridgeCasePack that transforms data across this edge.
   * If omitted, output is passed directly (keys must match exactly).
   */
  bridge_key: BridgeKeySchema.optional(),

  /** Optional human-readable edge label. */
  label: z.string().optional(),
});

// ── Schema ────────────────────────────────────────────────────────────────────

export const CasePackGraphSchema = z
  .object({
    /** Unique graph key. Format: graph.<name>.v<version> */
    key: GraphKeySchema,

    /** Semantic version of this graph definition. */
    version: SemVerSchema,

    /** Lifecycle status. */
    status: PackStatusSchema,

    /** All nodes in the graph. Must be non-empty. */
    nodes: z.array(GraphNodeSchema).min(1, {
      message: "CasePackGraph must have at least one node",
    }),

    /** All edges defining execution flow. */
    edges: z.array(GraphEdgeSchema),

    /**
     * The ID of the first node to execute.
     * REQUIRED. Must reference an existing node.
     */
    entry_node: z.string().min(1, {
      message: "entry_node is required",
    }),

    /**
     * IDs of nodes that represent terminal outputs of the graph.
     * REQUIRED. Must all reference existing nodes.
     */
    final_nodes: z.array(z.string().min(1)).min(1, {
      message: "final_nodes must name at least one terminal node",
    }),

    metadata: z
      .object({
        title: z.string().min(1),
        description: z.string().optional(),
        created_at: ISODateTimeSchema.optional(),
        updated_at: ISODateTimeSchema.optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const nodeIds = new Set(data.nodes.map((n) => n.id));

    // RULE 1: entry_node must reference an existing node
    if (!nodeIds.has(data.entry_node)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `entry_node "${data.entry_node}" does not reference an existing node (known: ${[...nodeIds].join(", ")})`,
        path: ["entry_node"],
      });
    }

    // RULE 2: all final_nodes must reference existing nodes
    for (const fn of data.final_nodes) {
      if (!nodeIds.has(fn)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `final_nodes references unknown node "${fn}" (known: ${[...nodeIds].join(", ")})`,
          path: ["final_nodes"],
        });
      }
    }

    // RULE 3: all edge from/to must reference existing nodes
    for (const [i, edge] of data.edges.entries()) {
      if (!nodeIds.has(edge.from)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `edges[${i}].from references unknown node "${edge.from}"`,
          path: ["edges", i, "from"],
        });
      }
      if (!nodeIds.has(edge.to)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `edges[${i}].to references unknown node "${edge.to}"`,
          path: ["edges", i, "to"],
        });
      }
    }
  });

export type CasePackGraph = z.infer<typeof CasePackGraphSchema>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
