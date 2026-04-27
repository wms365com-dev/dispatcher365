interface StatusPillProps {
  status: string;
}

function toTone(status: string) {
  const normalized = status.toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");

  if (normalized === "draft") {
    return "draft";
  }

  if (normalized === "ready-for-bol" || normalized === "bol-created") {
    return "ready";
  }

  if (
    normalized === "routed" ||
    normalized === "published" ||
    normalized === "in-transit"
  ) {
    return "active";
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
    normalized === "cancelled" ||
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
