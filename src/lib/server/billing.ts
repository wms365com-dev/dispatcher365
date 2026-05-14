import Stripe from "stripe";

export const TRIAL_LENGTH_DAYS = 14;
export const STRIPE_API_VERSION = "2026-04-22.dahlia";

let stripeClient: Stripe | null | undefined;

export type BillingTenantSnapshot = {
  id: string;
  name: string;
  slug: string;
  billingEmail?: string | null;
  trialStartedAt?: Date | null;
  trialEndsAt?: Date | null;
  billingStatus:
    | "TRIALING"
    | "ACTIVE"
    | "PAST_DUE"
    | "UNPAID"
    | "CANCELED"
    | "PAUSED"
    | "INCOMPLETE"
    | "INCOMPLETE_EXPIRED";
  accessState: "ACTIVE" | "LOCKED";
  billingLockedAt?: Date | null;
  billingLockReason?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  billingCurrentPeriodEnd?: Date | null;
  billingCheckoutCompletedAt?: Date | null;
};

export function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";
}

export function stripeBillingConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

export function stripeWebhookConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function stripePortalConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripePriceId() {
  return process.env.STRIPE_PRICE_ID ?? "";
}

export function getStripe() {
  if (stripeClient !== undefined) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    stripeClient = null;
    return stripeClient;
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION
  });

  return stripeClient;
}

export function buildTrialEndDate(from = new Date()) {
  const trialEnd = new Date(from);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_LENGTH_DAYS);
  return trialEnd;
}

export function resolveTenantAccess(input: BillingTenantSnapshot) {
  const now = Date.now();
  const trialExpired =
    input.billingStatus === "TRIALING" &&
    Boolean(input.trialEndsAt) &&
    input.trialEndsAt!.getTime() <= now;

  if (trialExpired) {
    return {
      locked: true,
      status: "PAST_DUE" as const,
      reason: "trial-expired"
    };
  }

  if (input.accessState === "LOCKED") {
    return {
      locked: true,
      status: input.billingStatus,
      reason: input.billingLockReason ?? "billing-hold"
    };
  }

  if (["PAST_DUE", "UNPAID", "CANCELED", "PAUSED", "INCOMPLETE", "INCOMPLETE_EXPIRED"].includes(input.billingStatus)) {
    return {
      locked: true,
      status: input.billingStatus,
      reason: input.billingLockReason ?? "billing-hold"
    };
  }

  return {
    locked: false,
    status: input.billingStatus,
    reason: input.billingLockReason ?? null
  };
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status | "paused"
): BillingTenantSnapshot["billingStatus"] {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "unpaid":
      return "UNPAID";
    case "canceled":
      return "CANCELED";
    case "paused":
      return "PAUSED";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    default:
      return "PAST_DUE";
  }
}

export function isLockedBillingStatus(status: BillingTenantSnapshot["billingStatus"]) {
  return ["PAST_DUE", "UNPAID", "CANCELED", "PAUSED", "INCOMPLETE", "INCOMPLETE_EXPIRED"].includes(status);
}

export function formatTrialDaysRemaining(trialEndsAt?: Date | null) {
  if (!trialEndsAt) {
    return null;
  }

  const diffMs = trialEndsAt.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 0);
}
