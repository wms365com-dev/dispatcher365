import Link from "next/link";

import {
  openBillingPortalAction,
  startBillingCheckoutAction
} from "@/lib/server/account-actions";
import { requireTenantSession } from "@/lib/server/auth";
import {
  formatTrialDaysRemaining,
  getConfiguredPricingPlans,
  resolveTenantAccess,
  stripeBillingConfigured,
  stripePortalConfigured
} from "@/lib/server/billing";
import { signOutAction } from "@/lib/server/auth-actions";

interface BillingPageProps {
  searchParams?: Promise<{
    success?: string;
    canceled?: string;
    error?: string;
    welcome?: string;
    reason?: string;
  }>;
}

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "stripe-not-configured": "Stripe checkout is not configured yet. Add the Stripe Railway variables before turning on paid billing.",
  "portal-not-configured": "The billing portal is not available until Stripe customer records are connected.",
  "checkout-failed": "We couldn't open the Stripe checkout session. Try again in a moment."
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const session = await requireTenantSession({ allowBillingHold: true });
  const tenantAccess = resolveTenantAccess(session.activeTenant);
  const daysRemaining = formatTrialDaysRemaining(session.activeTenant.trialEndsAt);
  const checkoutReady = stripeBillingConfigured();
  const portalReady = stripePortalConfigured() && Boolean(session.activeTenant.stripeCustomerId);
  const pricingPlans = getConfiguredPricingPlans();

  return (
    <main className="tenant-page">
      <section className="tenant-panel surface">
        <div className="tenant-panel__header">
          <p className="kicker">Billing</p>
          <h1>{session.activeTenant.name} subscription</h1>
          <p>
            Manage your 14-day trial, start paid billing, or recover access if payments fail.
          </p>
        </div>

        {params?.welcome === "trial-started" ? (
          <p className="auth-success">
            Your company trial is active. You can start dispatch work right away, or activate billing now so access stays uninterrupted after the trial ends.
          </p>
        ) : null}

        {params?.success === "checkout" ? (
          <p className="auth-success">
            Billing checkout completed. Stripe will update the subscription state as soon as the first payment or trial confirmation settles.
          </p>
        ) : null}

        {params?.canceled === "1" ? (
          <p className="auth-error">
            Billing checkout was canceled before completion.
          </p>
        ) : null}

        {params?.error && errorMessages[params.error] ? (
          <p className="auth-error">{errorMessages[params.error]}</p>
        ) : null}

        {tenantAccess.locked ? (
          <p className="auth-error">
            This tenant is locked for billing. Update the subscription or payment method to reopen the dispatch workspace.
          </p>
        ) : null}

        <div className="summary-grid">
          <article className="summary-card surface">
            <p className="kicker">Access</p>
            <p className="summary-card__value">{tenantAccess.locked ? "Locked" : "Active"}</p>
            <p className="summary-card__footnote">
              {tenantAccess.reason ? `Reason: ${tenantAccess.reason}` : "Workspace access is open."}
            </p>
          </article>
          <article className="summary-card surface">
            <p className="kicker">Billing status</p>
            <p className="summary-card__value">
              {session.activeTenant.billingStatus.replace(/_/g, " ")}
            </p>
            <p className="summary-card__footnote">
              Stripe customer: {session.activeTenant.stripeCustomerId ?? "not created yet"}
            </p>
          </article>
          <article className="summary-card surface">
            <p className="kicker">Trial</p>
            <p className="summary-card__value">
              {daysRemaining === null ? "-" : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`}
            </p>
            <p className="summary-card__footnote">
              Ends {session.activeTenant.trialEndsAt ? session.activeTenant.trialEndsAt.toISOString().slice(0, 10) : "not set"}
            </p>
          </article>
          <article className="summary-card surface">
            <p className="kicker">Billing email</p>
            <p className="summary-card__value billing-email">
              {session.activeTenant.billingEmail ?? session.user.email}
            </p>
            <p className="summary-card__footnote">
              This is where Stripe receipts and recovery messages should land.
            </p>
          </article>
        </div>

        <div className="pricing-grid">
          {pricingPlans.map((plan) => (
            <section className="section-card surface pricing-card" key={plan.key}>
              <div className="section-card__header">
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
              </div>
              <div className="pricing-card__body">
                <p className="pricing-card__price">{plan.monthlyPriceLabel}</p>
                <ul className="note-list">
                  <li>{plan.seatsLabel}</li>
                  <li>{plan.shipmentsLabel}</li>
                  <li>{plan.supportLabel}</li>
                </ul>
                {plan.selfServe ? (
                  <form action={startBillingCheckoutAction}>
                    <input name="planKey" type="hidden" value={plan.key} />
                    <button
                      className="button"
                      disabled={!checkoutReady || !plan.stripePriceId}
                      type="submit"
                    >
                      {plan.ctaLabel}
                    </button>
                  </form>
                ) : (
                  <div className="billing-actions">
                    <a className="button button--secondary" href="mailto:hello@wms365.co?subject=WMS%20365%20Dispatch%20Enterprise%20Pricing">
                      {plan.ctaLabel}
                    </a>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>

        {!checkoutReady ? (
          <p className="helper-text">
            Set `STRIPE_SECRET_KEY` plus at least one self-serve price id such as `STRIPE_PRICE_ID_STARTER` before paid checkout can go live.
          </p>
        ) : null}

        <div className="legacy-page-grid">
          <section className="section-card surface">
            <div className="section-card__header">
              <h3>Manage billing</h3>
              <p>
                Open Stripe’s hosted customer portal to update payment methods, download invoices, or recover a failed subscription.
              </p>
            </div>
            <div className="billing-actions">
              <form action={openBillingPortalAction}>
                <button className="button button--secondary" disabled={!portalReady} type="submit">
                  Open billing portal
                </button>
              </form>
              {!portalReady ? (
                <p className="helper-text">
                  The portal unlocks after Stripe customer records are created for this tenant.
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <div className="tenant-panel__footer">
          {!tenantAccess.locked ? (
            <Link className="button button--ghost" href="/dispatch">
              Back to dispatch
            </Link>
          ) : null}
          <Link className="button button--ghost" href="/select-tenant">
            Switch tenant
          </Link>
          <form action={signOutAction}>
            <button className="button button--secondary-dark" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
