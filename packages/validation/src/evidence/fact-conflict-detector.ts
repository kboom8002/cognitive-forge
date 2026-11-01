/**
 * Evidence Grounding & Fact Conflict Detector
 *
 * Implements D09_EVIDENCE_KNOWLEDGE_AND_CITATION_POLICY.md, T04_RUNTIME_AND_EVALUATION.md,
 * and Acceptance Scenario AT05:
 * - Detects conflicting factual/numerical assertions across multiple source documents
 *   (e.g., Source A says "10억" while Source B says "12억" for the same metric/subject)
 * - Verifies claim-to-citation mapping and computes citation coverage
 * - Flags conflicts so the runtime withholds final approval and routes to human review
 */

import type { CitationRef } from "@cognitive-forge/core";

export interface SourceDocumentInput {
  source_id: string;
  title?: string;
  content: string;
  metrics?: Record<string, string | number>;
}

export interface FactConflictItem {
  subject: string;
  source_a: { source_id: string; value: string };
  source_b: { source_id: string; value: string };
  description: string;
}

export interface FactConflictReport {
  has_conflict: boolean;
  requires_hold: boolean;
  conflicts: FactConflictItem[];
  citation_coverage: number;
  ungrounded_claims: string[];
}

const AMOUNT_REGEX = /([가-힣A-Za-z0-9_]+)\s*[:：은는이가]?\s*([0-9]+(?:\.[0-9]+)?\s*(?:억|만|천만|백만|원|달러|USD|KRW|%))/g;

function extractSubjectValues(doc: SourceDocumentInput): Map<string, string> {
  const map = new Map<string, string>();

  if (doc.metrics) {
    for (const [k, v] of Object.entries(doc.metrics)) {
      map.set(k.trim().toLowerCase(), String(v).trim());
    }
  }

  // Also extract amounts from natural text
  let match: RegExpExecArray | null;
  const regex = new RegExp(AMOUNT_REGEX.source, "g");
  while ((match = regex.exec(doc.content)) !== null) {
    const rawSubject = match[1]?.trim().toLowerCase() || "amount";
    const rawValue = match[2]?.replace(/\s+/g, "") || "";
    if (rawValue) {
      map.set(rawSubject, rawValue);
    }
  }

  // Fallback: if a document mentions standalone Korean/currency numbers like "10억" without a prefix key,
  // store under a generic `__primary_amount__` key when there is a single clear figure
  const standaloneAmounts = doc.content.match(/[0-9]+(?:\.[0-9]+)?\s*(?:억|만|원|달러|USD|KRW|%)/g);
  if (standaloneAmounts && standaloneAmounts.length === 1 && ! map.has("__primary_amount__")) {
    map.set("__primary_amount__", standaloneAmounts[0].replace(/\s+/g, ""));
  }

  return map;
}

/**
 * Inspects source documents and optional claim/citation pairs to detect factual conflicts
 * and ungrounded claims (`AT05`).
 */
export function detectFactConflicts(
  sources: SourceDocumentInput[],
  options?: {
    claims?: Array<{ claim: string; source_ids?: string[] }>;
    citations?: CitationRef[];
  }
): FactConflictReport {
  const conflicts: FactConflictItem[] = [];

  for (let i = 0; i < sources.length; i++) {
    const srcA = sources[i]!;
    const mapA = extractSubjectValues(srcA);
    for (let j = i + 1; j < sources.length; j++) {
      const srcB = sources[j]!;
      const mapB = extractSubjectValues(srcB);
      for (const [subject, valA] of mapA.entries()) {
        const valB = mapB.get(subject);
        if (valB !== undefined && valA !== valB) {
          conflicts.push({
            subject: subject === "__primary_amount__" ? "amount" : subject,
            source_a: { source_id: srcA.source_id, value: valA },
            source_b: { source_id: srcB.source_id, value: valB },
            description: `Conflicting values for '${subject === "__primary_amount__" ? "amount" : subject}': ${srcA.source_id} states '${valA}' vs ${srcB.source_id} states '${valB}'`,
          });
        }
      }
    }
  }

  const validSourceIds = new Set(sources.map((s) => s.source_id));
  const ungroundedClaims: string[] = [];
  let groundedCount = 0;
  const claims = options?.claims ?? [];

  for (const item of claims) {
    const refs = item.source_ids ?? [];
    const hasValidRef = refs.length > 0 && refs.every((id) => validSourceIds.has(id));
    if (hasValidRef) {
      groundedCount += 1;
    } else {
      ungroundedClaims.push(item.claim);
    }
  }

  let citationCoverage = 1.0;
  if (claims.length > 0) {
    citationCoverage = Number((groundedCount / claims.length).toFixed(4));
  } else if (options?.citations) {
    if (options.citations.length === 0 && sources.length > 0) {
      citationCoverage = 0;
    } else if (options.citations.length > 0) {
      const validCitations = options.citations.filter(
        (c) => validSourceIds.size === 0 || validSourceIds.has(c.source_id)
      );
      citationCoverage = Number((validCitations.length / options.citations.length).toFixed(4));
    }
  }

  const hasConflict = conflicts.length > 0;
  return {
    has_conflict: hasConflict,
    requires_hold: hasConflict || ungroundedClaims.length > 0,
    conflicts,
    citation_coverage: citationCoverage,
    ungrounded_claims: ungroundedClaims,
  };
}
