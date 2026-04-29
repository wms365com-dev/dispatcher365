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
      <div className="page-header__title-row">
        <div>
          <h2>
            {title}
            <small>dashboard &amp; statistics</small>
          </h2>
          <div className="page-bar">
            <span>Home</span>
            <span className="page-bar__sep">›</span>
            <span>{eyebrow}</span>
          </div>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div>
        <p className="page-header__description">{description}</p>
      </div>
    </div>
  );
}
