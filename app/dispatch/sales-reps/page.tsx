import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";

export default function SalesRepsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legacy module mapped forward"
        title="Sales Rep"
        description="The original Healtea tenant kept a dedicated sales-rep module tied to packing slips and order references. This page marks that module as a first-class rebuild target."
      />

      <div className="split-grid">
        <SectionCard
          title="Legacy Behavior To Preserve"
          description="The old site treated sales reps as reusable master data instead of free text."
        >
          <ul className="note-list">
            <li>Dispatchers could assign a sales rep during packing slip entry.</li>
            <li>Sales rep maintenance had its own enter/list workflow.</li>
            <li>Sales rep values flowed into lookup and print contexts without being retyped.</li>
          </ul>
        </SectionCard>

        <SectionCard
          title="Rebuild Direction"
          description="This should become a normalized tenant-owned table rather than a loose shipment field."
        >
          <ul className="note-list">
            <li>Add a `sales_reps` table with tenant scope, contact info, and active/inactive state.</li>
            <li>Turn shipment sales rep entry into a lookup instead of a free-form text box.</li>
            <li>Carry the selected sales rep through BOL, route, and customer communication flows.</li>
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
