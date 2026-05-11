/**
 * transforms.ts — Safe, whitelisted transform functions for MappingRuleExecutor.
 *
 * No eval(), no dynamic code execution. All transforms are pure, deterministic
 * functions that accept a value and return a transformed value.
 *
 * Supported transform expressions (referenced in mapping_rules[i].transform):
 *   copy               — pass-through (default when transform is omitted)
 *   trim               — trim surrounding whitespace
 *   uppercase          — convert to uppercase
 *   lowercase          — convert to lowercase
 *   normalize          — collapse whitespace runs, trim
 *   rename             — copy with no modification (alias for copy)
 *   default:<fallback> — return value if truthy, else fallback string
 *   prefix:<str>       — prepend string to value
 *   suffix:<str>       — append string to value
 *   template:<tpl>     — fill {{VALUE}} placeholder in template with value
 *   summarize          — deterministic truncation to ≤280 chars + "…"
 *   infer              — returns value if present, else a placeholder signal
 *   concat:<sep>       — join array elements with separator
 */

/** A value as it arrives from a source CasePack output field. */
export type TransformValue = unknown;

/**
 * Applies a named transform expression to a source value.
 * Unknown transform names fall back to `copy` and are logged as a warning.
 *
 * @param value   - The source field value.
 * @param expr    - The transform expression string (e.g. "trim", "default:N/A").
 * @returns       The transformed value.
 */
export function applyTransform(value: TransformValue, expr: string): unknown {
  // Trim outer whitespace only — do NOT trim the full expression because
  // args after the colon (separator chars, prefixes with spaces) are meaningful.
  const trimmed = expr.replace(/^\s+|\s+$/g, "");

  // ── copy / rename ────────────────────────────────────────────────────────
  if (trimmed === "copy" || trimmed === "rename" || trimmed === "") {
    return value;
  }

  // ── trim ─────────────────────────────────────────────────────────────────
  if (trimmed === "trim") {
    return typeof value === "string" ? value.trim() : value;
  }

  // ── uppercase ─────────────────────────────────────────────────────────────
  if (trimmed === "uppercase") {
    return typeof value === "string" ? value.toUpperCase() : value;
  }

  // ── lowercase ─────────────────────────────────────────────────────────────
  if (trimmed === "lowercase") {
    return typeof value === "string" ? value.toLowerCase() : value;
  }

  // ── normalize — collapse whitespace runs, then trim ───────────────────────
  if (trimmed === "normalize") {
    return typeof value === "string"
      ? value.replace(/\s+/g, " ").trim()
      : value;
  }

  // ── summarize — deterministic truncation (≤280 chars) ────────────────────
  if (trimmed === "summarize") {
    if (typeof value !== "string") return value;
    const MAX = 280;
    const normalised = value.replace(/\s+/g, " ").trim();
    return normalised.length > MAX
      ? normalised.slice(0, MAX).trimEnd() + "..."
      : normalised;
  }

  // ── infer — pass value through or return placeholder ─────────────────────
  if (trimmed === "infer") {
    if (value !== undefined && value !== null && value !== "") return value;
    return "[inferred — value not available from source]";
  }

  // ── default:<fallback> ────────────────────────────────────────────────────
  // Use indexOf to split only at the first colon — preserving arg verbatim.
  if (trimmed.startsWith("default:")) {
    const fallback = expr.slice(expr.indexOf("default:") + "default:".length);
    if (value === undefined || value === null || value === "") return fallback;
    return value;
  }

  // ── prefix:<str> — arg is everything after "prefix:" verbatim ────────────
  if (trimmed.startsWith("prefix:")) {
    const pre = expr.slice(expr.indexOf("prefix:") + "prefix:".length);
    return typeof value === "string" ? `${pre}${value}` : value;
  }

  // ── suffix:<str> — arg is everything after "suffix:" verbatim ────────────
  if (trimmed.startsWith("suffix:")) {
    const suf = expr.slice(expr.indexOf("suffix:") + "suffix:".length);
    return typeof value === "string" ? `${value}${suf}` : value;
  }

  // ── template:<tpl> — arg is everything after "template:" verbatim ─────────
  if (trimmed.startsWith("template:")) {
    const tpl = expr.slice(expr.indexOf("template:") + "template:".length);
    const str = value !== undefined && value !== null ? String(value) : "";
    return tpl.replace(/\{\{VALUE\}\}/g, str);
  }

  // ── concat:<sep> — sep is everything after "concat:" verbatim ────────────
  if (trimmed.startsWith("concat:")) {
    const sep = expr.slice(expr.indexOf("concat:") + "concat:".length);
    if (Array.isArray(value)) {
      return (value as unknown[]).map(String).join(sep);
    }
    return value;
  }

  // ── Unknown transform — warn and fall back to copy ───────────────────────
  // eslint-disable-next-line no-console
  console.warn(`[BridgeRunner] Unknown transform expression "${trimmed}" — using copy`);
  return value;
}
