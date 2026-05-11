import type { DomainPackManifest } from "@cognitive-forge/core";

export interface PublicPackSummary {
  name: string;
  description: string;
  domain: string;
  primary_app_slug: string;
  status: string;
}

export function sanitizePackManifest(manifest: DomainPackManifest): PublicPackSummary {
  return {
    name: manifest.metadata?.title || manifest.key,
    description: manifest.metadata?.description || "No description provided.",
    domain: manifest.metadata?.tags?.[0] || "General",
    primary_app_slug: manifest.primary_app_slug,
    status: manifest.status,
  };
}
