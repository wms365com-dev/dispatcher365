interface SummaryCardProps {
  label: string;
  value: string;
  footnote: string;
}

export function SummaryCard({ label, value, footnote }: SummaryCardProps) {
  return (
    <article className="surface summary-card">
      <p className="kicker">{label}</p>
      <div className="summary-card__value">{value}</div>
      <p className="summary-card__footnote">{footnote}</p>
    </article>
  );
}
