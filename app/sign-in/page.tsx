import { redirect } from "next/navigation";

import { PublicSignInPanel } from "@/components/public-auth-panels";
import { PublicSiteShell } from "@/components/public-site-shell";
import { PRODUCT_NAME } from "@/lib/branding";
import { getCurrentSession } from "@/lib/server/auth";
import {
  ensureDemoSeed
} from "@/lib/server/demo-seed";

interface SignInPageProps {
  searchParams?: Promise<{
    error?: string;
    reset?: string;
  }>;
}

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "invalid-credentials": `The email or password did not match an account in ${PRODUCT_NAME}.`,
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
  const resetComplete = params?.reset === "1";

  return (
    <PublicSiteShell>
      <PublicSignInPanel errorMessage={errorMessage} resetComplete={resetComplete} />
    </PublicSiteShell>
  );
}
