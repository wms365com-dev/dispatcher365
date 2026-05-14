"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  passwordResetRequestSchema,
  passwordResetSchema,
  signUpSchema
} from "@/lib/validators";

import { clearSessionCookie, requireTenantSession, writeSessionCookie } from "./auth";
import {
  buildTrialEndDate,
  getConfiguredPricingPlans,
  getAppBaseUrl,
  getStripe,
  getStripePriceIdForPlan,
  stripeBillingConfigured,
  stripePortalConfigured
} from "./billing";
import { createPasswordHash } from "./password";
import { consumePasswordResetToken, issuePasswordResetToken } from "./password-reset";

function toFormObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function buildTenantSlug(companyName: string) {
  return companyName.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

async function ensureStripeCustomer(input: {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  billingEmail: string;
  stripeCustomerId?: string | null;
}) {
  const stripe = getStripe();

  if (!stripe) {
    return null;
  }

  if (input.stripeCustomerId) {
    return input.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: input.billingEmail,
    name: input.tenantName,
    metadata: {
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug
    }
  });

  await prisma.tenant.update({
    where: { id: input.tenantId },
    data: {
      stripeCustomerId: customer.id
    }
  });

  return customer.id;
}

export async function signUpAction(formData: FormData) {
  const raw = signUpSchema.parse(toFormObject(formData));
  const tenantSlug = raw.companySlug || buildTenantSlug(raw.companyName);
  const billingEmail = raw.billingEmail ?? raw.email;

  const [existingUser, existingTenant] = await Promise.all([
    prisma.user.findUnique({
      where: { email: raw.email }
    }),
    prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    })
  ]);

  if (existingUser) {
    redirect("/sign-up?error=email-exists");
  }

  if (existingTenant) {
    redirect("/sign-up?error=slug-exists");
  }

  const now = new Date();
  const tenant = await prisma.tenant.create({
    data: {
      slug: tenantSlug,
      name: raw.companyName,
      billingEmail,
      trialStartedAt: now,
      trialEndsAt: buildTrialEndDate(now),
      billingStatus: "TRIALING",
      accessState: "ACTIVE",
      warehousePhone: raw.phone
    }
  });

  const user = await prisma.user.create({
    data: {
      email: raw.email,
      fullName: raw.fullName,
      passwordHash: createPasswordHash(raw.password)
    }
  });

  await prisma.tenantMembership.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: "TENANT_ADMIN"
    }
  });

  await writeSessionCookie({
    userId: user.id,
    tenantId: tenant.id
  });

  redirect("/billing?welcome=trial-started");
}

export async function requestPasswordResetAction(formData: FormData) {
  const data = passwordResetRequestSchema.parse(toFormObject(formData));

  const user = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (user?.passwordHash) {
    await issuePasswordResetToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName
    });
  }

  redirect("/forgot-password?sent=1");
}

export async function resetPasswordAction(formData: FormData) {
  const data = passwordResetSchema.parse(toFormObject(formData));
  const record = await consumePasswordResetToken(data.token);

  if (!record) {
    redirect("/reset-password?error=invalid-token");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: createPasswordHash(data.password)
      }
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: {
        usedAt: new Date()
      }
    })
  ]);

  await clearSessionCookie();
  redirect("/sign-in?reset=1");
}

export async function startBillingCheckoutAction(formData: FormData) {
  const session = await requireTenantSession({ allowBillingHold: true });
  const selectedPlanKey = typeof formData.get("planKey") === "string" ? String(formData.get("planKey")) : "starter";

  if (!stripeBillingConfigured()) {
    redirect("/billing?error=stripe-not-configured");
  }

  const stripe = getStripe();

  if (!stripe) {
    redirect("/billing?error=stripe-not-configured");
  }

  const selectedPlan = getConfiguredPricingPlans().find(
    (plan) => plan.key === selectedPlanKey && plan.selfServe && plan.stripePriceId
  );

  if (!selectedPlan?.stripePriceId) {
    redirect("/billing?error=invalid-plan");
  }

  const customerId = await ensureStripeCustomer({
    tenantId: session.activeTenant.id,
    tenantName: session.activeTenant.name,
    tenantSlug: session.activeTenant.slug,
    billingEmail: session.activeTenant.billingEmail ?? session.user.email,
    stripeCustomerId: session.activeTenant.stripeCustomerId
  });

  if (!customerId) {
    redirect("/billing?error=stripe-not-configured");
  }

  const trialEnd =
    session.activeTenant.billingStatus === "TRIALING" &&
    session.activeTenant.trialEndsAt &&
    session.activeTenant.trialEndsAt.getTime() > Date.now()
      ? Math.floor(session.activeTenant.trialEndsAt.getTime() / 1000)
      : undefined;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: session.activeTenant.id,
    success_url: `${getAppBaseUrl()}/billing?success=checkout`,
    cancel_url: `${getAppBaseUrl()}/billing?canceled=1`,
    line_items: [
      {
        price: selectedPlan.stripePriceId,
        quantity: 1
      }
    ],
    allow_promotion_codes: true,
    customer_update: {
      address: "auto",
      name: "auto"
    },
    metadata: {
      tenantId: session.activeTenant.id,
      tenantSlug: session.activeTenant.slug
    },
    subscription_data: {
      metadata: {
        tenantId: session.activeTenant.id,
        tenantSlug: session.activeTenant.slug
      },
      ...(trialEnd ? { trial_end: trialEnd } : {})
    }
  });

  await prisma.tenant.update({
    where: { id: session.activeTenant.id },
    data: {
      stripeCustomerId: customerId,
      stripePriceId: getStripePriceIdForPlan(selectedPlan.key)
    }
  });

  redirect((checkoutSession.url ?? "/billing?error=checkout-failed") as never);
}

export async function openBillingPortalAction() {
  const session = await requireTenantSession({ allowBillingHold: true });

  if (!stripePortalConfigured()) {
    redirect("/billing?error=portal-not-configured");
  }

  const stripe = getStripe();

  if (!stripe || !session.activeTenant.stripeCustomerId) {
    redirect("/billing?error=portal-not-configured");
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: session.activeTenant.stripeCustomerId,
    return_url: `${getAppBaseUrl()}/billing`
  });

  redirect(portalSession.url as never);
}
