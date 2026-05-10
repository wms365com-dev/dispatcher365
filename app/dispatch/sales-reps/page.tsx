import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { createSalesRepAction } from "@/lib/server/dispatch-actions";
import { getSalesRepsData } from "@/lib/server/dispatch-service";

export default async function SalesRepsPage() {
  const { salesReps } = await getSalesRepsData();

  const rows = salesReps.map((salesRep) => ({
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
        description="The old system used a dedicated sales rep module. This rebuild keeps that master data separate so packing slip entry can use clean lookups instead of loose text."
      />

      <div className="legacy-page-grid">
        <SectionCard
          title="Use Form Input"
          description="Enter the sales rep once, then reuse the code across packing slips, BOLs, and customer communication."
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

        <SectionCard
          title="Sales Rep List"
          description="This lines up with the old sales lookup table and keeps rep code, name, and contact details together."
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
      </div>
    </>
  );
}
