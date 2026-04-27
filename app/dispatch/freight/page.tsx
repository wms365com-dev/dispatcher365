import { FreightCalculator } from "@/components/freight-calculator";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";

export default function FreightPage() {
  return (
    <>
      <PageHeader
        eyebrow="Freight specs"
        title="Freight Calculator"
        description="The workbook `FREIGHT SPECS` sheet becomes reusable code and a dedicated UI for density and class calculations."
      />

      <SectionCard
        title="Freight Calculator"
        description="This starter panel converts the workbook cube -> density -> freight class logic into reusable TypeScript."
      >
        <FreightCalculator />
      </SectionCard>

      <SectionCard
        title="Why this matters"
        description="Freight logic should be reused by packing slips, BOLs, and route planning instead of being copied into print sheets."
      >
        <ul className="note-list">
          <li>Use the same freight service in BOL draft generation.</li>
          <li>Store the computed values on the shipment for auditability.</li>
          <li>Allow manual override with reason capture when dispatch changes the class.</li>
        </ul>
      </SectionCard>
    </>
  );
}
