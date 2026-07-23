import { NextResponse } from "next/server";

/** Shared admin token (Presence preferred; Persona legacy alias). */
export function getAdminToken(): string | undefined {
  const token =
    process.env.PRESENCE_ADMIN_TOKEN?.trim() ||
    process.env.PERSONA_ADMIN_TOKEN?.trim();
  return token || undefined;
}

export function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    process.env.PRESENCE_REQUIRE_ADMIN === "1"
  );
}

/**
 * Gate write/admin routes.
 * - Production: fail-closed — require a configured token and a matching header.
 * - Development: unlocked when no token is set (local convenience).
 *
 * Accepts `Authorization: Bearer …`, `x-presence-admin-token`, or legacy
 * `x-persona-admin-token`.
 */
export function assertAdmin(request: Request): NextResponse | null {
  const token = getAdminToken();
  const production = isProductionRuntime();

  if (!token) {
    if (production) {
      return NextResponse.json(
        {
          error:
            "Unauthorized — set PRESENCE_ADMIN_TOKEN before exposing write routes in production",
        },
        { status: 401 },
      );
    }
    return null;
  }

  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const alt =
    request.headers.get("x-presence-admin-token") ||
    request.headers.get("x-persona-admin-token");

  if (bearer === token || alt === token) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
