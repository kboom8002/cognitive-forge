export interface PublicTrustSignalSummary {
  validation_status: "pass" | "warning" | "fail";
  completeness_score?: number;
  risk_notes?: string[];
  missing_information?: string[];
  is_export_ready: boolean;
}

export interface InternalTrustSignalPayload extends PublicTrustSignalSummary {
  _internal_report?: Record<string, unknown>;
}

export function sanitizeTrustSignals(raw: InternalTrustSignalPayload): PublicTrustSignalSummary {
  const result: PublicTrustSignalSummary = {
    validation_status: raw.validation_status,
    is_export_ready: raw.is_export_ready,
  };
  if (raw.completeness_score !== undefined) result.completeness_score = raw.completeness_score;
  if (raw.risk_notes !== undefined) result.risk_notes = raw.risk_notes;
  if (raw.missing_information !== undefined) result.missing_information = raw.missing_information;
  return result;
}
