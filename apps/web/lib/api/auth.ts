/**
 * Management API authentication guard.
 *
 * Protects internal / management API routes (/api/casepacks/*, /api/graphs/*,
 * /api/packs/*, /api/apps/*) from unauthenticated public access.
 *
 * Accepts either:
 *   1. x-api-key header or Authorization: Bearer <ADMIN_API_KEY / SUPABASE_SERVICE_ROLE_KEY>
 *      matching configured server admin credentials.
 *   2. Authorization: Bearer <jwt> validated against Supabase Auth via createUserClient(jwt).auth.getUser().
 *
 * Throws AppError(AppErrorCode.UNAUTHORIZED) (HTTP 401) if missing or invalid.
 */

import { AppError, AppErrorCode } from "@cognitive-forge/core";
import { createUserClient } from "../supabase/client";

export interface AuthenticatedCaller {
  type: "admin" | "user";
  userId?: string;
}

export async function requireManagementAuth(req: Request): Promise<AuthenticatedCaller> {
  const apiKeyHeader = req.headers.get("x-api-key")?.trim();
  const authHeader = req.headers.get("authorization")?.trim();
  const bearerToken =
    authHeader && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : undefined;

  const adminKey = process.env.ADMIN_API_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  // 1. Check server admin / service-role key match
  if (adminKey && adminKey.length > 0) {
    if (apiKeyHeader === adminKey || bearerToken === adminKey) {
      return { type: "admin" };
    }
  }
  if (serviceKey && serviceKey.length > 0) {
    if (apiKeyHeader === serviceKey || bearerToken === serviceKey) {
      return { type: "admin" };
    }
  }

  // 2. Check Supabase user JWT
  if (!bearerToken) {
    throw new AppError(
      AppErrorCode.UNAUTHORIZED,
      "Authentication required: provide Authorization: Bearer <token> or x-api-key header"
    );
  }

  try {
    const userClient = createUserClient(bearerToken);
    const { data, error } = await userClient.auth.getUser();
    if (error || !data?.user) {
      throw new AppError(
        AppErrorCode.UNAUTHORIZED,
        "Invalid or expired authentication token"
      );
    }
    return { type: "user", userId: data.user.id };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      AppErrorCode.UNAUTHORIZED,
      "Authentication verification failed"
    );
  }
}
