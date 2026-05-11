/**
 * JSON primitive and recursive value types.
 * Used across all schemas where arbitrary JSON is accepted.
 *
 * These are pure TypeScript types — no Zod here.
 * The Zod runtime equivalents live in src/schemas/primitives.ts.
 */

/** A JSON-serialisable scalar value. */
export type JsonPrimitive = string | number | boolean | null;

/** A JSON-serialisable value of any depth. */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/** A JSON object (string-keyed record of JsonValue). */
export type JsonObject = { [key: string]: JsonValue };

/** A JSON array. */
export type JsonArray = JsonValue[];
