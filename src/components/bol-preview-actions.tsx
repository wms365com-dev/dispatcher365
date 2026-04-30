"use client";

export function BolPreviewActions() {
  return (
    <aside className="legacy-bol-actions">
      <button className="button legacy-bol-actions__print" type="button" onClick={() => window.print()}>
        Print This Form
      </button>
      <div className="legacy-bol-actions__email">
        <input disabled placeholder="Enter email address" type="email" />
        <button className="button" disabled type="button">
          Send
        </button>
      </div>
      <p className="helper-text">Email delivery will be wired into the document service after the print form is finalized.</p>
    </aside>
  );
}
