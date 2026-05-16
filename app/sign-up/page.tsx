import Link from "next/link";
import { redirect } from "next/navigation";

import { PRODUCT_NAME } from "@/lib/branding";
import { signUpAction } from "@/lib/server/account-actions";
import { getCurrentSession } from "@/lib/server/auth";

interface SignUpPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "email-exists": "That email is already attached to an account.",
  "slug-exists": "That company URL slug is already in use. Try a different company slug."
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const session = await getCurrentSession();

  if (session?.activeMembership) {
    redirect("/dispatch");
  }

  if (session) {
    redirect("/select-tenant");
  }

  const errorMessage = params?.error ? errorMessages[params.error] : undefined;

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <p className="kicker">Start your tenant</p>
        <h1>Launch {PRODUCT_NAME}</h1>
        <p className="auth-copy">
          Create your company workspace, get a 14-day free trial, and start running shipments,
          BOLs, truck runs, and delivery execution in one tenant-safe system.
        </p>

        <div className="auth-feature-grid">
          <article className="auth-feature">
            <h3>14-day trial</h3>
            <p>Every new company starts with a full two-week trial before the billing wall turns on.</p>
          </article>
          <article className="auth-feature">
            <h3>Tenant-safe setup</h3>
            <p>Your customers, carriers, drivers, and freight data stay inside your company workspace.</p>
          </article>
          <article className="auth-feature">
            <h3>Billing recovery ready</h3>
            <p>When billing is connected, customers can self-serve payment updates through Stripe’s hosted portal.</p>
          </article>
        </div>
      </section>

      <section className="auth-panel surface">
        <div className="auth-panel__header">
          <p className="kicker">Create account</p>
          <h2>Set up your company admin</h2>
          <p>
            This creates the company tenant, the first tenant admin, and starts the 14-day trial.
          </p>
        </div>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <form action={signUpAction} className="auth-form">
          <label className="field">
            <span>Company name</span>
            <input name="companyName" placeholder="Healtea" required />
          </label>
          <label className="field">
            <span>Company URL slug</span>
            <input name="companySlug" placeholder="healtea" />
          </label>
          <label className="field">
            <span>Your full name</span>
            <input name="fullName" placeholder="Jane Dispatcher" required />
          </label>
          <label className="field">
            <span>Admin email</span>
            <input name="email" type="email" placeholder="jane@company.com" required />
          </label>
          <label className="field">
            <span>Billing email</span>
            <input name="billingEmail" type="email" placeholder="billing@company.com" />
          </label>
          <label className="field">
            <span>Phone</span>
            <input name="phone" placeholder="905-555-0199" />
          </label>
          <label className="field field--wide">
            <span>Password</span>
            <input name="password" type="password" minLength={8} required />
          </label>
          <div className="field field--wide form-actions">
            <button className="button auth-submit" type="submit">
              Create company and start trial
            </button>
          </div>
        </form>

        <div className="auth-links">
          <Link href="/sign-in">Already have an account? Sign in</Link>
          <Link href="/pricing">View pricing</Link>
        </div>
      </section>
    </main>
  );
}
