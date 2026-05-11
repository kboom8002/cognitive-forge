-- =============================================================================
-- Migration: 20260502000001_extensions.sql
-- Enable required PostgreSQL extensions.
-- Safe to run multiple times — all statements use IF NOT EXISTS.
-- =============================================================================

-- UUID generation (gen_random_uuid() available natively in PG 13+,
-- but uuid-ossp provides uuid_generate_v4() as a fallback)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions (gen_random_bytes, crypt, digest, etc.)
-- Used by auth layer and future token generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
