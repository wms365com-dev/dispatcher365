import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { createIssueReportAction } from "@/lib/server/dispatch-actions";
import { getAppContext } from "@/lib/server/dispatch-service";

interface ReportIssuePageProps {
  searchParams?: Promise<{
    pagePath?: string;
    submitted?: string;
  }>;
}

export default async function ReportIssuePage({ searchParams }: ReportIssuePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const { tenant } = await getAppContext();

  return (
    <>
      <PageHeader
        eyebrow="Report issue"
        title="Report a Workflow Issue"
        description="Capture bugs, broken buttons, or confusing workflow steps in the database so admins can triage them inside the platform."
      />

      {params?.submitted ? (
        <SectionCard
          title="Issue Submitted"
          description="The report is saved inside the tenant database and visible to admin users in the issue inbox."
        >
          <p className="helper-text">
            Thanks. We logged the issue for <strong>{tenant.name}</strong> and kept it inside the tenant workflow record.
          </p>
        </SectionCard>
      ) : null}

      <SectionCard
        title="New Issue Report"
        description="Use this for broken actions, data mismatches, print problems, or workflow steps that do not behave like the legacy system."
      >
        <form action={createIssueReportAction} className="legacy-form-grid">
          <label className="field field--wide">
            <span>Page Path</span>
            <input name="pagePath" defaultValue={params?.pagePath ?? ""} placeholder="/dispatch/bols" />
          </label>
          <label className="field field--wide">
            <span>Short Title</span>
            <input name="title" placeholder="Grouped BOL preview only shows one batch" required />
          </label>
          <label className="field field--wide">
            <span>Details</span>
            <textarea
              name="details"
              rows={8}
              placeholder="Describe what happened, what page you were on, and what you expected instead."
              required
            />
          </label>
          <div className="field field--wide form-actions">
            <button className="button" type="submit">
              Save Issue
            </button>
          </div>
        </form>
      </SectionCard>
    </>
  );
}
