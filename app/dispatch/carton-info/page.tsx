import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { createProductAction } from "@/lib/server/dispatch-actions";
import { getCartonInfoData } from "@/lib/server/dispatch-service";

function formatMeasure(value?: number | null) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

export default async function CartonInfoPage() {
  const { products } = await getCartonInfoData();

  const rows = products.map((product) => ({
    sku: product.sku,
    description: product.description,
    packageType: product.packageType ?? "-",
    nmfc: product.nmfcCode ?? "-",
    weight: formatMeasure(product.defaultWeightLb),
    dims:
      product.lengthIn && product.widthIn && product.heightIn
        ? `${formatMeasure(product.lengthIn)} x ${formatMeasure(product.widthIn)} x ${formatMeasure(product.heightIn)}`
        : "-",
    cube: formatMeasure(product.volumeCuFt)
  }));

  return (
    <>
      <PageHeader
        eyebrow="Carton Info"
        title="Item Info"
        description="This rebuild keeps the dedicated carton master from the old system so freight calculations and label output come from structured item data."
      />

      <div className="legacy-page-grid">
        <SectionCard
          title="Use Form Input"
          description="Enter the item or carton profile once, then reuse it for packing slip defaults and label output."
        >
          <form action={createProductAction} className="legacy-form-grid">
            <label className="field">
              <span>SKU</span>
              <input name="sku" placeholder="PLT-CARTON-001" required />
            </label>
            <label className="field">
              <span>Product Line</span>
              <input name="productLine" placeholder="Houseware" />
            </label>
            <label className="field">
              <span>Description</span>
              <input name="description" placeholder="Houseware Master Carton" required />
            </label>
            <label className="field">
              <span>Product Type</span>
              <input name="productType" placeholder="Carton" />
            </label>
            <label className="field">
              <span>Package Type</span>
              <input name="packageType" placeholder="CTN" />
            </label>
            <label className="field">
              <span>NMFC Code</span>
              <input name="nmfcCode" placeholder="049390-06" />
            </label>
            <label className="field">
              <span>Default Weight (lb)</span>
              <input name="defaultWeightLb" type="number" step="0.01" placeholder="20" />
            </label>
            <label className="field">
              <span>Case Pack</span>
              <input name="casePack" placeholder="1" />
            </label>
            <label className="field">
              <span>Length (in)</span>
              <input name="lengthIn" type="number" step="0.01" placeholder="24" />
            </label>
            <label className="field">
              <span>Width (in)</span>
              <input name="widthIn" type="number" step="0.01" placeholder="18" />
            </label>
            <label className="field">
              <span>Height (in)</span>
              <input name="heightIn" type="number" step="0.01" placeholder="16" />
            </label>
            <label className="field">
              <span>Volume (cu ft)</span>
              <input name="volumeCuFt" type="number" step="0.01" placeholder="4.00" />
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
          title="Carton Info"
          description="The old item table was dense and operational. This version keeps the same spirit while cleaning up the data model."
        >
          <SimpleTable
            columns={[
              { key: "sku", label: "SKU" },
              { key: "description", label: "Description" },
              { key: "packageType", label: "Type" },
              { key: "nmfc", label: "NMFC" },
              { key: "weight", label: "Weight" },
              { key: "dims", label: "Dimensions" },
              { key: "cube", label: "Cube" }
            ]}
            rows={rows}
            emptyMessage="No carton or item profiles have been entered yet."
          />
        </SectionCard>
      </div>
    </>
  );
}
