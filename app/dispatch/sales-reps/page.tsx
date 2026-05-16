import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { createSalesRepAction } from "@/lib/server/dispatch-actions";
import { getSalesRepsData } from "@/lib/server/dispatch-service";

interface SalesRepsPageProps {
  searchParams?: Promise<{
    view?: string;
  }>;
}

export default async function SalesRepsPage({ searchParams }: SalesRepsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const view = params?.view === "list" ? "list" : "create";
  const { salesReps } = await getSalesRepsData();

  const rows = salesReps.map((salesRep: (typeof salesReps)[number]) => ({
    code: salesRep.repCode,
    name: salesRep.fullName,
    email: salesRep.email ?? "-",
    phone: salesRep.phone ?? "-",
    active: salesRep.isActive ? "Active" : "Inactive"
  }));

  return (
    <>
      <PageHeader
        eyebrow="Sales Rep"
        title="Sales Info"
        description={view === "list" ? "Sales rep lookup follows the old separate list screen." : "Enter sales rep records once, then reuse the code during packing entry."}
      />

      {view === "create" ? (
        <SectionCard
          title="Use Form Input"
          description="Enter the sales rep once, then reuse the code across packing slips and BOLs."
        >
          <form action={createSalesRepAction} className="legacy-form-grid">
            <label className="field">
              <span>Sales Code</span>
              <input name="repCode" placeholder="ZE47" required />
            </label>
            <label className="field">
              <span>Phone</span>
              <input name="phone" placeholder="2015550181" />
            </label>
            <label className="field">
              <span>Full Name</span>
              <input name="fullName" placeholder="Zoe Edwards" required />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="sales@example.com" />
            </label>
            <div className="field field--wide form-actions">
              <button className="button" type="submit">
                Submit Form
              </button>
              <button className="button button--ghost" type="reset">
                Reset
              </button>
            </div>
          </form>
        </SectionCard>
      ) : (
        <SectionCard
          title="Sales Rep List"
          description="Rep lookup is kept separate from entry like the old system."
        >
          <SimpleTable
            columns={[
              { key: "code", label: "Code" },
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "active", label: "Status" }
            ]}
            rows={rows}
            emptyMessage="No sales reps have been added for this tenant yet."
          />
        </SectionCard>
      )}
    </>
  );
}
