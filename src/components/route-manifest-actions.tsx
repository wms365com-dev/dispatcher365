"use client";

import { sendRouteManifestEmailAction } from "@/lib/server/dispatch-actions";

interface RouteManifestActionsProps {
  routeRunId: string;
  defaultEmail?: string;
  emailConfigured: boolean;
}

export function RouteManifestActions({
  routeRunId,
  defaultEmail,
  emailConfigured
}: RouteManifestActionsProps) {
  return (
    <aside className="legacy-bol-actions route-manifest-actions">
      <button className="button legacy-bol-actions__print" type="button" onClick={() => window.print()}>
        Print This Page
      </button>
      <form action={sendRouteManifestEmailAction} className="legacy-bol-actions__email">
        <input name="toEmail" placeholder="Enter email address" type="email" defaultValue={defaultEmail} required />
        <input name="routeRunId" type="hidden" value={routeRunId} />
        <button className="button" type="submit">
          Email to Carrier
        </button>
      </form>
      <p className="helper-text">
        {emailConfigured
          ? "Manifest email is active. Send the truck run to the assigned carrier or dispatcher."
          : "SMTP is not configured yet. Add SMTP settings in Railway to enable manifest email delivery."}
      </p>
    </aside>
  );
}
