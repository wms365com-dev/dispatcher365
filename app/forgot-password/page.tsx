import { redirect } from "next/navigation";

import { PublicForgotPanel } from "@/components/public-auth-panels";
import { PublicSiteShell } from "@/components/public-site-shell";
import { getCurrentSession } from "@/lib/server/auth";

interface ForgotPasswordPageProps {
  searchParams?: Promise<{
    sent?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({
  searchParams
}: ForgotPasswordPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const session = await getCurrentSession();

  if (session?.activeMembership) {
    redirect("/dispatch");
  }

  if (session) {
    redirect("/select-tenant");
  }

  return (
    <PublicSiteShell>
      <PublicForgotPanel sent={params?.sent === "1"} />
    </PublicSiteShell>
  );
}
