import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { updateIssueReportAction } from "@/lib/server/dispatch-actions";
import { getIssueReportsData } from "@/lib/server/dispatch-service";

interface IssuesPageProps {
  searchParams?: Promise<{
    updated?: string;
  }>;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function IssuesPage({ searchParams }: IssuesPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const { context, reports } = await getIssueReportsData();
  const isAdmin = context.role === "PLATFORM_ADMIN" || context.role === "TENANT_ADMIN";

  return (
    <>
      <PageHeader
        eyebrow="Issue inbox"
        title={isAdmin ? "Issue Inbox" : "My Issue Reports"}
        description="Issue reports are stored in the database so admins can work through bugs and workflow mismatches without losing the tenant context."
      />

      {params?.updated ? (
        <SectionCard
          title="Issue Updated"
          description="The issue status and admin notes were saved."
        >
          <p className="helper-text">The issue inbox is refreshed with the latest workflow notes.</p>
        </SectionCard>
      ) : null}

      <SectionCard
        title={isAdmin ? "Open and Historical Reports" : "Your Submitted Reports"}
        description={
          isAdmin
            ? "Admins can triage issues across the tenant and update status or notes directly from this screen."
            : "You can review the reports you submitted and watch for admin follow-up."
        }
      >
        <div className="stack-grid">
          {reports.map((report) => (
            <article className="issue-card" key={report.id}>
              <div className="issue-card__header">
                <div>
                  <p className="kicker">{report.pagePath ?? "General workflow issue"}</p>
                  <h4>{report.title}</h4>
                  <p className="helper-text">
                    {report.tenant.name} | {report.user?.fullName ?? "Unknown user"} | {formatDate(report.createdAt)}
                  </p>
                </div>
                <StatusPill status={report.status} />
              </div>
              <p className="issue-card__details">{report.details}</p>
              {report.adminNotes ? (
                <p className="issue-card__notes">
                  <strong>Admin notes:</strong> {report.adminNotes}
                </p>
              ) : null}

              {isAdmin ? (
                <form action={updateIssueReportAction} className="legacy-form-grid issue-card__form">
                  <input name="issueReportId" type="hidden" value={report.id} />
                  <label className="field">
                    <span>Status</span>
                    <select defaultValue={report.status} name="status">
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                  </label>
                  <label className="field field--wide">
                    <span>Admin Notes</span>
                    <textarea
                      name="adminNotes"
                      rows={3}
                      defaultValue={report.adminNotes ?? ""}
                      placeholder="What was fixed, what is blocked, or what the team should verify next."
                    />
                  </label>
                  <div className="field field--wide form-actions">
                    <button className="button button--secondary-dark" type="submit">
                      Update Issue
                    </button>
                  </div>
                </form>
              ) : null}
            </article>
          ))}

          {!reports.length ? (
            <p className="helper-text">No issue reports are stored yet.</p>
          ) : null}
        </div>
      </SectionCard>
    </>
  );
}
