import { redirect } from "next/navigation";

import { signInAction } from "@/lib/server/auth-actions";
import { getCurrentSession } from "@/lib/server/auth";
import {
  demoCredentials,
  demoSeedingEnabled,
  ensureDemoSeed
} from "@/lib/server/demo-seed";

interface SignInPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

const errorMessages: Record<string, string> = {
  "invalid-credentials": "The email or password did not match an account in WMS 365 Dispatch.",
  "no-tenant-access": "This user does not belong to a tenant yet."
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  await ensureDemoSeed();

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
        <p className="kicker">Warehouse + freight operations</p>
        <h1>WMS 365 Dispatch</h1>
        <p className="auth-copy">
          Rebuilt from the legacy workbook and 10-year-old dispatch site into a tenant-safe web
          application for shipments, BOLs, route runs, and driver handoff.
        </p>

        <div className="auth-feature-grid">
          <article className="auth-feature">
            <h3>Tenant isolation</h3>
            <p>Customers, carriers, drivers, shipments, BOLs, and route runs stay inside the active company.</p>
          </article>
          <article className="auth-feature">
            <h3>Structured workflow</h3>
            <p>Shipment intake feeds BOL generation, then route planning, then publish-to-driver.</p>
          </article>
          <article className="auth-feature">
            <h3>Railway-ready backend</h3>
            <p>SQLite-first structure is already aligned so we can move to PostgreSQL later without rebuilding the app model.</p>
          </article>
        </div>
      </section>

      <section className="auth-panel surface">
        <div className="auth-panel__header">
          <p className="kicker">Sign in</p>
          <h2>Open the dispatch workspace</h2>
          <p>
            {demoSeedingEnabled
              ? "Use the seeded demo account below for local testing while we keep building."
              : "Sign in with a valid WMS 365 Dispatch account."}
          </p>
        </div>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <form action={signInAction} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input
              defaultValue={demoSeedingEnabled ? demoCredentials.email : ""}
              name="email"
              type="email"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              defaultValue={demoSeedingEnabled ? demoCredentials.password : ""}
              name="password"
              type="password"
              required
            />
          </label>
          <button className="button auth-submit" type="submit">
            Sign in to WMS 365 Dispatch
          </button>
        </form>

        {demoSeedingEnabled ? (
          <div className="auth-demo surface">
            <p className="kicker">Seeded demo access</p>
            <p>
              <strong>Email:</strong> {demoCredentials.email}
            </p>
            <p>
              <strong>Password:</strong> {demoCredentials.password}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
