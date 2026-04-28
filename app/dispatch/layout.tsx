import type { ReactNode } from "react";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { getAppContext } from "@/lib/server/dispatch-service";
import { signOutAction } from "@/lib/server/auth-actions";

interface DispatchLayoutProps {
  children: ReactNode;
}

export const dynamic = "force-dynamic";

export default async function DispatchLayout({ children }: DispatchLayoutProps) {
  const { tenant, user, role } = await getAppContext();
  const roleLabel = role
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());

  const topbarActions = (
    <>
      <Link className="button button--ghost" href="/select-tenant">
        Switch tenant
      </Link>
      <form action={signOutAction}>
        <button className="button button--secondary-dark" type="submit">
          Sign out
        </button>
      </form>
    </>
  );

  return (
    <AppShell
      tenantName={tenant.name}
      tenantSlug={tenant.slug}
      userEmail={user.email}
      roleLabel={roleLabel}
      topbarActions={topbarActions}
    >
      {children}
    </AppShell>
  );
}
