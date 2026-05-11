"use client";

import { sendBolEmailAction } from "@/lib/server/dispatch-actions";

interface BolPreviewActionsProps {
  bolNumber: string;
  batchIds: string[];
  defaultEmail?: string;
  emailConfigured: boolean;
}

export function BolPreviewActions({
  bolNumber,
  batchIds,
  defaultEmail,
  emailConfigured
}: BolPreviewActionsProps) {
  return (
    <aside className="legacy-bol-actions">
      <button className="button legacy-bol-actions__print" type="button" onClick={() => window.print()}>
        Print This Form
      </button>
      <form action={sendBolEmailAction} className="legacy-bol-actions__email">
        <input name="toEmail" placeholder="Enter email address" type="email" defaultValue={defaultEmail} required />
        <input name="bolNumber" type="hidden" value={bolNumber} />
        <input name="batchIds" type="hidden" value={batchIds.join(",")} />
        <button className="button" type="submit">
          Send
        </button>
      </form>
      <p className="helper-text">
        {emailConfigured
          ? "Email delivery is active. Send the grouped BOL to a customer, warehouse contact, or carrier."
          : "SMTP is not configured yet. Add SMTP settings in Railway to enable email delivery."}
      </p>
    </aside>
  );
}
