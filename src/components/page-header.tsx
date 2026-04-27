import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <p className="kicker">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="page-header__description">{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
