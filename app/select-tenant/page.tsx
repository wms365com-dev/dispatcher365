import { redirect } from "next/navigation";

import { selectTenantAction, signOutAction } from "@/lib/server/auth-actions";
import { requireSession } from "@/lib/server/auth";
import { formatTrialDaysRemaining, resolveTenantAccess } from "@/lib/server/billing";

interface SelectTenantPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function SelectTenantPage({ searchParams }: SelectTenantPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const session = await requireSession();

  if (session.memberships.length === 1 && session.activeMembership) {
    if (session.tenantAccess?.locked) {
      redirect("/billing");
    }
    redirect("/dispatch");
  }

  return (
    <main className="tenant-page">
      <section className="tenant-panel surface">
        <div className="tenant-panel__header">
          <p className="kicker">Company selection</p>
          <h1>Choose your workspace</h1>
          <p>
            Sign-in is user-based, but operational data stays inside the selected tenant. Pick the
            company you want to work in before opening dispatch.
          </p>
        </div>

        {params?.error === "invalid-tenant" ? (
          <p className="auth-error">That tenant selection is not available to this user.</p>
        ) : null}

        <div className="tenant-grid">
          {session.memberships.map((membership: (typeof session.memberships)[number]) => {
            const tenantAccess = resolveTenantAccess(membership.tenant);
            const trialDays = formatTrialDaysRemaining(membership.tenant.trialEndsAt);

            return (
              <article className="tenant-card" key={membership.id}>
                <div>
                  <p className="kicker">{membership.role.replace(/_/g, " ")}</p>
                  <h3>{membership.tenant.name}</h3>
                  <p>{membership.tenant.slug}</p>
                </div>

                <p className="helper-text">
                  {tenantAccess.locked
                    ? `Billing locked (${membership.tenant.billingStatus.replace(/_/g, " ").toLowerCase()}).`
                    : membership.tenant.billingStatus === "TRIALING"
                      ? `Trial active: ${trialDays ?? 0} day${trialDays === 1 ? "" : "s"} remaining.`
                      : `Billing status: ${membership.tenant.billingStatus.replace(/_/g, " ").toLowerCase()}.`}
                </p>

                <form action={selectTenantAction}>
                  <input name="tenantId" type="hidden" value={membership.tenantId} />
                  <button className="button" type="submit">
                    Open tenant
                  </button>
                </form>
              </article>
            );
          })}
        </div>

        <form action={signOutAction}>
          <button className="button button--secondary-dark" type="submit">
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
