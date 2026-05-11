-- =============================================================================
-- Migration: 20260502000009_validation_tables.sql
-- Validation result records produced by the validation layer.
--
-- Consumed by: RepairEngine, OutputCard trust badge, billing aggregates.
-- One record per run (or per node_run for graph executions).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- validation_results
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS validation_results (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic run reference: casepack_runs.id, graph_runs.id, or node_runs.id.
  run_id       uuid        NOT NULL,

  -- Distinguishes which parent table run_id references.
  run_type     text        NOT NULL,

  -- Whether the output passed all validation checks.
  valid        boolean     NOT NULL,

  -- Summary status:
  --   pass    : all required fields present, no blocking errors
  --   fail    : blocking errors — output cannot be used as-is
  --   warning : usable but non-blocking issues detected
  status       text        NOT NULL,

  -- Array of ValidationError objects (code, message, path, blocking).
  -- Stored as JSONB for schema flexibility across pack versions.
  errors       jsonb       NOT NULL DEFAULT '[]',

  -- Non-blocking advisory messages.
  warnings     jsonb       NOT NULL DEFAULT '[]',

  -- ISO timestamp when validation was performed.
  checked_at   timestamptz NOT NULL DEFAULT now(),

  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT validation_results_run_type_values
    CHECK (run_type IN ('casepack', 'graph', 'node')),

  CONSTRAINT validation_results_status_values
    CHECK (status IN ('pass', 'fail', 'warning')),

  -- Consistency rule (mirrors ValidationReportSchema.superRefine):
  -- valid=false must not have status='pass'.
  CONSTRAINT validation_results_valid_status_consistency
    CHECK (NOT (valid = false AND status = 'pass')),

  -- valid=true must not have status='fail'.
  CONSTRAINT validation_results_valid_fail_consistency
    CHECK (NOT (valid = true AND status = 'fail'))
);

COMMENT ON TABLE validation_results IS
  'Validation result record for each CasePack, Graph, or Node run. '
  'Mirrors ValidationReportSchema from packages/core. '
  'DB-level CHECK constraints enforce valid/status consistency.';

COMMENT ON COLUMN validation_results.errors IS
  'Array of ValidationError objects: {code, message, path?, blocking}. '
  'Blocking errors (blocking=true) trigger the RepairEngine.';

COMMENT ON COLUMN validation_results.warnings IS
  'Non-blocking advisory messages. Safe to surface in trust badge UI.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Primary lookup: find the validation result for a given run.
CREATE INDEX IF NOT EXISTS idx_validation_results_run_id
  ON validation_results (run_id);

-- Filter by run type (e.g. list all failed node validations in a graph run).
CREATE INDEX IF NOT EXISTS idx_validation_results_run_type_status
  ON validation_results (run_type, status);

-- Partial index: quickly find all failed validations across the platform
-- (used by repair monitoring dashboards).
CREATE INDEX IF NOT EXISTS idx_validation_results_failed
  ON validation_results (created_at DESC)
  WHERE status = 'fail';
