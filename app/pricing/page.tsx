import { PublicSignInPanel } from "@/components/public-auth-panels";
import { PublicSiteShell } from "@/components/public-site-shell";
import { PRODUCT_NAME } from "@/lib/branding";
import { getConfiguredPricingPlans } from "@/lib/server/billing";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  const pricingPlans = getConfiguredPricingPlans();

  return (
    <PublicSiteShell
      overlay={
        <section className="legacy-modal legacy-modal--pricing">
          <header className="legacy-modal__header legacy-modal__header--stacked">
            <h2>Pricing</h2>
            <h3>{PRODUCT_NAME} plans</h3>
          </header>

          <div className="legacy-pricing">
            {pricingPlans.map((plan) => (
              <article className="legacy-pricing__card" key={plan.key}>
                <h4>{plan.name}</h4>
                <p className="legacy-pricing__price">{plan.monthlyPriceLabel}</p>
                <p className="legacy-pricing__description">{plan.description}</p>
                <ul className="legacy-pricing__list">
                  <li>{plan.seatsLabel}</li>
                  <li>{plan.shipmentsLabel}</li>
                  <li>{plan.supportLabel}</li>
                  <li>14-day free trial included</li>
                </ul>
              </article>
            ))}
          </div>
        </section>
      }
    >
      <PublicSignInPanel />
    </PublicSiteShell>
  );
}
