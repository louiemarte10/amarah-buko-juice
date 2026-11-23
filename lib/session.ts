// Edge-safe session helpers (jose only — no Node-specific APIs).
// Used by both middleware (edge) and server route handlers.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "amarah_session";
const ALG = "HS256";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  sub: string; // user id
  name: string;
  role: "ADMIN" | "CASHIER"; // permission tier (derived from the staff role's isAdmin)
  roleName: string; // display label, e.g. "Administrator", "Manager", "Cashier"
};

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Add it to your .env (see .env.example).",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    name: payload.name,
    role: payload.role,
    roleName: payload.roleName,
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      name: (payload.name as string) ?? "",
      role: (payload.role as "ADMIN" | "CASHIER") ?? "CASHIER",
      roleName: (payload.roleName as string) ?? "Cashier",
    };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
