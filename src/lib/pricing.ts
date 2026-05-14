export type PricingPlanKey = "starter" | "growth" | "enterprise";

export type PricingPlan = {
  key: PricingPlanKey;
  name: string;
  monthlyPriceLabel: string;
  description: string;
  seatsLabel: string;
  shipmentsLabel: string;
  supportLabel: string;
  ctaLabel: string;
  selfServe: boolean;
  stripePriceId?: string;
};

export function getPricingPlans() {
  const starterPriceId =
    process.env.STRIPE_PRICE_ID_STARTER ?? process.env.STRIPE_PRICE_ID ?? undefined;
  const growthPriceId = process.env.STRIPE_PRICE_ID_GROWTH ?? undefined;

  const plans: PricingPlan[] = [
    {
      key: "starter",
      name: "Starter",
      monthlyPriceLabel: "$299/mo",
      description: "Best for a single dispatch team getting off spreadsheets and managing daily shipment flow in one tenant.",
      seatsLabel: "Up to 5 office users",
      shipmentsLabel: "Up to 750 shipments per month",
      supportLabel: "Email support",
      ctaLabel: "Start Starter plan",
      selfServe: true,
      stripePriceId: starterPriceId
    },
    {
      key: "growth",
      name: "Growth",
      monthlyPriceLabel: "$599/mo",
      description: "For teams running higher shipment volume, multiple dispatchers, and carrier/driver collaboration.",
      seatsLabel: "Up to 15 office users",
      shipmentsLabel: "Up to 3,000 shipments per month",
      supportLabel: "Priority support",
      ctaLabel: "Start Growth plan",
      selfServe: true,
      stripePriceId: growthPriceId
    },
    {
      key: "enterprise",
      name: "Enterprise",
      monthlyPriceLabel: "Custom",
      description: "For multi-site operations, custom onboarding, deeper integrations, and higher-volume carrier/mobile execution.",
      seatsLabel: "Custom user limits",
      shipmentsLabel: "Custom shipment volume",
      supportLabel: "White-glove support",
      ctaLabel: "Contact for Enterprise",
      selfServe: false
    }
  ];

  return plans;
}

export function getSelfServePricingPlan(planKey?: string) {
  return getPricingPlans().find((plan) => plan.key === planKey && plan.selfServe && plan.stripePriceId);
}

