import Link from "next/link";
import { redirect } from "next/navigation";

import { requestPasswordResetAction } from "@/lib/server/account-actions";
import { getCurrentSession } from "@/lib/server/auth";

interface ForgotPasswordPageProps {
  searchParams?: Promise<{
    sent?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const session = await getCurrentSession();

  if (session?.activeMembership) {
    redirect("/dispatch");
  }

  if (session) {
    redirect("/select-tenant");
  }

  return (
    <main className="auth-page auth-page--single">
      <section className="auth-panel surface">
        <div className="auth-panel__header">
          <p className="kicker">Password reset</p>
          <h2>Send reset link</h2>
          <p>
            Enter your account email and we’ll send a one-hour reset link if that user exists.
          </p>
        </div>

        {params?.sent === "1" ? (
          <p className="auth-success">
            If that email is in the system, a reset link is on the way.
          </p>
        ) : null}

        <form action={requestPasswordResetAction} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required />
          </label>
          <button className="button auth-submit" type="submit">
            Email reset link
          </button>
        </form>

        <div className="auth-links">
          <Link href="/sign-in">Back to sign in</Link>
        </div>
      </section>
    </main>
  );
}
