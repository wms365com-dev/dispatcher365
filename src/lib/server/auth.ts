import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { resolveTenantAccess } from "./billing";
import { verifyPasswordHash } from "./password";

const SESSION_COOKIE_NAME = "wms365_dispatch_session";

interface SessionPayload {
  userId: string;
  tenantId?: string;
}

function getSessionSecret() {
  return process.env.AUTH_SECRET ?? process.env.JWT_SECRET ?? "dev-only-wms365-dispatch-secret";
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
    user.memberships.find(
      (membership: (typeof user.memberships)[number]) => membership.tenantId === payload.tenantId
    ) ??
    (user.memberships.length === 1 ? user.memberships[0] : null);
  let activeTenant = activeMembership?.tenant ?? null;

  if (
    activeTenant &&
    activeTenant.billingStatus === "TRIALING" &&
    activeTenant.trialEndsAt &&
    activeTenant.trialEndsAt.getTime() <= Date.now()
  ) {
    activeTenant = await prisma.tenant.update({
      where: { id: activeTenant.id },
      data: {
        billingStatus: "PAST_DUE",
        accessState: "LOCKED",
        billingLockedAt: activeTenant.billingLockedAt ?? new Date(),
        billingLockReason: activeTenant.billingLockReason ?? "trial-expired"
      }
    });
  }

  const tenantAccess = activeTenant ? resolveTenantAccess(activeTenant) : null;

  return {
    user,
    memberships: user.memberships,
    activeMembership,
    activeTenant,
    tenantAccess
  };
}

export async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/sign-in");
  }

  return session;
}

export async function requireTenantSession(options?: {
  allowBillingHold?: boolean;
}) {
  const session = await requireSession();

  if (!session.activeMembership || !session.activeTenant) {
    redirect("/select-tenant");
  }

  if (
    !options?.allowBillingHold &&
    session.activeMembership.role !== "PLATFORM_ADMIN" &&
    session.tenantAccess?.locked
  ) {
    const params = new URLSearchParams();
    if (session.tenantAccess.reason) {
      params.set("reason", session.tenantAccess.reason);
    }
    redirect((`/billing${params.toString() ? `?${params.toString()}` : ""}`) as never);
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
