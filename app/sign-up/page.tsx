import { redirect } from "next/navigation";

import {
  PublicSignInPanel,
  PublicSignUpModal
} from "@/components/public-auth-panels";
import { PublicSiteShell } from "@/components/public-site-shell";
import { getCurrentSession } from "@/lib/server/auth";

interface SignUpPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "email-exists": "That email is already attached to an account.",
  "slug-exists": "That company URL slug is already in use. Try a different company slug.",
  validation: "Please double-check the required fields and make sure both passwords match."
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
    <PublicSiteShell overlay={<PublicSignUpModal errorMessage={errorMessage} />}>
      <PublicSignInPanel />
    </PublicSiteShell>
  );
}
