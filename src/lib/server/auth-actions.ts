"use server";

import { redirect } from "next/navigation";

import { ensureDemoSeed } from "@/lib/server/demo-seed";

import {
  authenticateUser,
  clearSessionCookie,
  requireSession,
  writeSessionCookie
} from "./auth";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signInAction(formData: FormData) {
  await ensureDemoSeed();

  const email = getStringValue(formData, "email");
  const password = getStringValue(formData, "password");

  const user = await authenticateUser(email, password);

  if (!user) {
    redirect("/sign-in?error=invalid-credentials");
  }

  const firstMembership = user.memberships[0];

  if (!user.memberships.length || !firstMembership) {
    redirect("/sign-in?error=no-tenant-access");
  }

  if (user.memberships.length === 1) {
    await writeSessionCookie({
      userId: user.id,
      tenantId: firstMembership.tenantId
    });

    redirect("/dispatch");
  }

  await writeSessionCookie({
    userId: user.id
  });

  redirect("/select-tenant");
}

export async function signOutAction() {
  await clearSessionCookie();
  redirect("/sign-in");
}

export async function selectTenantAction(formData: FormData) {
  const tenantId = getStringValue(formData, "tenantId");
  const session = await requireSession();
  const membership = session.memberships.find((candidate) => candidate.tenantId === tenantId);

  if (!membership) {
    redirect("/select-tenant?error=invalid-tenant");
  }

  await writeSessionCookie({
    userId: session.user.id,
    tenantId: membership.tenantId
  });

  redirect("/dispatch");
}
