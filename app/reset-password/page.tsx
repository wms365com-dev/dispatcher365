import Link from "next/link";
import { redirect } from "next/navigation";

import { resetPasswordAction } from "@/lib/server/account-actions";
import { getCurrentSession } from "@/lib/server/auth";

interface ResetPasswordPageProps {
  searchParams?: Promise<{
    token?: string;
    error?: string;
  }>;
}

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "invalid-token": "That reset link is invalid or expired. Request a fresh one below."
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const session = await getCurrentSession();

  if (session?.activeMembership) {
    redirect("/dispatch");
  }

  if (session) {
    redirect("/select-tenant");
  }

  const token = params?.token ?? "";
  const errorMessage = params?.error ? errorMessages[params.error] : undefined;

  return (
    <main className="auth-page auth-page--single">
      <section className="auth-panel surface">
        <div className="auth-panel__header">
          <p className="kicker">Password reset</p>
          <h2>Choose a new password</h2>
          <p>
            Reset links are one-time use and expire after one hour.
          </p>
        </div>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <form action={resetPasswordAction} className="auth-form">
          <input name="token" type="hidden" value={token} />
          <label className="field">
            <span>New password</span>
            <input name="password" type="password" minLength={8} required />
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input name="confirmPassword" type="password" minLength={8} required />
          </label>
          <button className="button auth-submit" type="submit">
            Save new password
          </button>
        </form>

        <div className="auth-links">
          <Link href="/forgot-password">Need a new reset link?</Link>
        </div>
      </section>
    </main>
  );
}
