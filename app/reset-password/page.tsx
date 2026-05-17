import { redirect } from "next/navigation";

import { PublicResetPanel } from "@/components/public-auth-panels";
import { PublicSiteShell } from "@/components/public-site-shell";
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

export default async function ResetPasswordPage({
  searchParams
}: ResetPasswordPageProps) {
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
    <PublicSiteShell>
      <PublicResetPanel errorMessage={errorMessage} token={token} />
    </PublicSiteShell>
  );
}
