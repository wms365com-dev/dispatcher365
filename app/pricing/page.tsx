import Link from "next/link";

import { PRODUCT_NAME } from "@/lib/branding";
import { getConfiguredPricingPlans } from "@/lib/server/billing";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  const pricingPlans = getConfiguredPricingPlans();

  return (
    <main className="auth-page auth-page--single">
      <section className="tenant-panel surface">
        <div className="tenant-panel__header">
          <p className="kicker">Pricing</p>
          <h1>{PRODUCT_NAME} plans</h1>
          <p>
            Start with a 14-day free trial, then move into the plan that matches your shipment volume and dispatch team size.
          </p>
        </div>

        <div className="pricing-grid">
          {pricingPlans.map((plan) => (
            <article className="section-card surface pricing-card" key={plan.key}>
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
                  <li>14-day free trial included</li>
                </ul>
              </div>
            </article>
          ))}
        </div>

        <div className="tenant-panel__footer">
          <Link className="button" href="/sign-up">
            Start free trial
          </Link>
          <Link className="button button--ghost" href="/sign-in">
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
