import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/server/auth";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (session?.activeMembership) {
    redirect("/dispatch");
  }

  if (session) {
    redirect("/select-tenant");
  }

  redirect("/sign-in");
}
