import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { verifyPasswordHash } from "./password";

const SESSION_COOKIE_NAME = "wms365_dispatch_session";

interface SessionPayload {
  userId: string;
  tenantId?: string;
}

function getSessionSecret() {
  return process.env.AUTH_SECRET ?? "dev-only-wms365-dispatch-secret";
}

function signValue(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signValue(body)}`;
}

function decodeSession(token?: string) {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expected = signValue(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

export async function writeSessionCookie(payload: SessionPayload) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionPayload() {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function getCurrentSession() {
  const payload = await getSessionPayload();

  if (!payload?.userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      memberships: {
        include: {
          tenant: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!user) {
    return null;
  }

  const activeMembership =
    user.memberships.find((membership) => membership.tenantId === payload.tenantId) ??
    (user.memberships.length === 1 ? user.memberships[0] : null);

  return {
    user,
    memberships: user.memberships,
    activeMembership,
    activeTenant: activeMembership?.tenant ?? null
  };
}

export async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/sign-in");
  }

  return session;
}

export async function requireTenantSession() {
  const session = await requireSession();

  if (!session.activeMembership || !session.activeTenant) {
    redirect("/select-tenant");
  }

  return session as typeof session & {
    activeMembership: NonNullable<typeof session.activeMembership>;
    activeTenant: NonNullable<typeof session.activeTenant>;
  };
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      memberships: {
        include: {
          tenant: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!user || !verifyPasswordHash(password, user.passwordHash)) {
    return null;
  }

  return user;
}
