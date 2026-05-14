import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (session?.activeMembership) {
    if (session.tenantAccess?.locked) {
      redirect("/billing");
    }
    redirect("/dispatch");
  }

  if (session) {
    redirect("/select-tenant");
  }

  redirect("/sign-in");
}
