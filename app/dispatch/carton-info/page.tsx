import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";

export default function CartonInfoPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legacy module mapped forward"
        title="Carton Info"
        description="The original Healtea workflow kept a separate carton master for item dimensions, case types, and label output. This module is the placeholder for that rebuilt data model."
      />

      <div className="split-grid">
        <SectionCard
          title="What This Module Will Own"
          description="This is being carried forward directly from the live Aeson system instead of getting folded into generic shipment fields."
        >
          <ul className="note-list">
            <li>Carton and item master data with dimensions, cube, and weight defaults.</li>
            <li>Reusable carton profiles for label generation and freight calculations.</li>
            <li>Optional SKU and item description data for carton and pallet label variants.</li>
            <li>Cleaner normalization than the legacy add/list carton screens.</li>
          </ul>
        </SectionCard>

        <SectionCard
          title="Why It Matters"
          description="This was a real module in the live site, so we should preserve it explicitly in the rebuild."
        >
          <ul className="note-list">
            <li>Packing slip entry should be able to pull carton defaults instead of forcing manual dimensions every time.</li>
            <li>Label output should come from structured carton records, not copied worksheet values.</li>
            <li>Freight tools should be able to calculate class from normalized carton data.</li>
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
