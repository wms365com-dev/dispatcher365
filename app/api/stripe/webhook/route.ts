import Stripe from "stripe";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  getStripe,
  isLockedBillingStatus,
  mapStripeSubscriptionStatus,
  stripeWebhookConfigured
} from "@/lib/server/billing";

async function updateTenantFromSubscription(subscription: Stripe.Subscription) {
  const stripeCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  const stripeSubscriptionId = subscription.id;
  const tenantId = subscription.metadata?.tenantId;
  const billingStatus = mapStripeSubscriptionStatus(subscription.status);
  const accessState = isLockedBillingStatus(billingStatus) ? "LOCKED" : "ACTIVE";

  const tenant = await prisma.tenant.findFirst({
    where: tenantId
      ? {
          OR: [{ id: tenantId }, { stripeCustomerId }, { stripeSubscriptionId }]
        }
      : {
          OR: [{ stripeCustomerId }, { stripeSubscriptionId }]
        }
  });

  if (!tenant) {
    return;
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId: subscription.items.data[0]?.price.id ?? tenant.stripePriceId,
      billingStatus,
      accessState,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : tenant.trialEndsAt,
      billingCurrentPeriodEnd: tenant.billingCurrentPeriodEnd,
      billingCheckoutCompletedAt: accessState === "ACTIVE" ? new Date() : tenant.billingCheckoutCompletedAt,
      billingLockedAt: accessState === "LOCKED" ? tenant.billingLockedAt ?? new Date() : null,
      billingLockReason: accessState === "LOCKED" ? `subscription-${billingStatus.toLowerCase()}` : null
    }
  });
}

export async function POST(request: Request) {
  if (!stripeWebhookConfigured()) {
    return NextResponse.json({ ok: false, error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const stripe = getStripe();

  if (!stripe) {
    return NextResponse.json({ ok: false, error: "Stripe client is unavailable." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "subscription") {
        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        const tenantId = session.metadata?.tenantId ?? session.client_reference_id ?? undefined;

        const tenant = tenantId
          ? await prisma.tenant.findUnique({
              where: { id: tenantId }
            })
          : null;

        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              stripeCustomerId: stripeCustomerId ?? tenant.stripeCustomerId,
              stripeSubscriptionId: stripeSubscriptionId ?? tenant.stripeSubscriptionId,
              billingCheckoutCompletedAt: new Date()
            }
          });
        }

        if (stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          await updateTenantFromSubscription(subscription);
        }
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed": {
      await updateTenantFromSubscription(event.data.object as Stripe.Subscription);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

      if (stripeCustomerId) {
        await prisma.tenant.updateMany({
          where: { stripeCustomerId },
          data: {
            accessState: "LOCKED",
            billingStatus: "PAST_DUE",
            billingLockedAt: new Date(),
            billingLockReason: "invoice-payment-failed"
          }
        });
      }
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

      if (stripeCustomerId) {
        await prisma.tenant.updateMany({
          where: { stripeCustomerId },
          data: {
            accessState: "ACTIVE",
            billingStatus: "ACTIVE",
            billingLockedAt: null,
            billingLockReason: null,
            billingCheckoutCompletedAt: new Date()
          }
        });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
