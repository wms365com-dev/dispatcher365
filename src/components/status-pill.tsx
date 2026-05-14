interface StatusPillProps {
  status: string;
}

function toTone(status: string) {
  const normalized = status.toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");

  if (normalized === "draft") {
    return "draft";
  }

  if (
    normalized === "ready-for-bol" ||
    normalized === "bol-created" ||
    normalized === "pick-complete"
  ) {
    return "ready";
  }

  if (
    normalized === "shipped" ||
    normalized === "ready-for-pu" ||
    normalized === "routed" ||
    normalized === "published" ||
    normalized === "in-transit" ||
    normalized === "accepted" ||
    normalized === "driver-assigned"
  ) {
    return "active";
  }

  if (normalized === "offered") {
    return "ready";
  }

  if (
    normalized === "delivered" ||
    normalized === "completed" ||
    normalized === "payment-collected"
  ) {
    return "complete";
  }

  if (
    normalized === "exception" ||
    normalized === "need-extension" ||
    normalized === "cancelled" ||
    normalized === "declined" ||
    normalized === "reassigned" ||
    normalized === "refused" ||
    normalized === "returned"
  ) {
    return "alert";
  }

  return "neutral";
}

function toLabel(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function StatusPill({ status }: StatusPillProps) {
  return <span className={`status-pill status-pill--${toTone(status)}`}>{toLabel(status)}</span>;
}
