import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { getLabelsData } from "@/lib/server/dispatch-service";

function formatDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 16).replace("T", " ") : "Pending";
}

export default async function LabelsPage() {
  const { labelJobs } = await getLabelsData();

  const rows = labelJobs.map((job) => ({
    batchId: job.shipment?.batchId ?? "-",
    customer: job.shipment?.customer.customerCode ?? "-",
    kind: job.labelKind,
    quantity: String(job.quantity),
    printedAt: formatDate(job.printedAt)
  }));

  return (
    <>
      <PageHeader
        eyebrow="Carton + pallet labels"
        title="Label Generator"
        description="Label jobs now come from the same tenant-owned shipment data model as the rest of dispatch."
      />

      <SectionCard
        title="Label Jobs"
        description="These jobs represent the current printable output queue for carton and pallet labels."
      >
        <SimpleTable
          columns={[
            { key: "batchId", label: "Batch" },
            { key: "customer", label: "Customer" },
            { key: "kind", label: "Kind" },
            { key: "quantity", label: "Quantity" },
            { key: "printedAt", label: "Printed" }
          ]}
          rows={rows}
          emptyMessage="No label jobs have been generated yet."
        />
      </SectionCard>

      <SectionCard
        title="Template Notes"
        description="The next step here is turning these records into browser-printable and PDF-ready carton and pallet templates."
      >
        <ul className="note-list">
          <li>Carton and pallet labels should share one rendering engine with variant-specific layouts.</li>
          <li>Output should support browser print first, then PDF, then thermal label formats.</li>
          <li>Ship-to data should be pulled from normalized customer locations, not hidden worksheet cells.</li>
        </ul>
      </SectionCard>
    </>
  );
}
