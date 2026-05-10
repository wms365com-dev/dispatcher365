import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { createCompanyAction } from "@/lib/server/dispatch-actions";
import { getCompaniesData } from "@/lib/server/dispatch-service";

export default async function CompaniesPage() {
  const { tenants } = await getCompaniesData();

  const rows = tenants.map((tenant) => ({
    name: tenant.name,
    slug: tenant.slug,
    users: String(tenant._count.memberships),
    customers: String(tenant._count.customers),
    shipments: String(tenant._count.shipments),
    warehouse: tenant.warehouseCity && tenant.warehouseState ? `${tenant.warehouseCity}, ${tenant.warehouseState}` : "-"
  }));

  return (
    <>
      <PageHeader
        eyebrow="Company Manage"
        title="Companies List"
        description="This restores the admin company view so we can keep tenant setup, warehouse profile, and active companies in one place."
      />

      <div className="legacy-page-grid">
        <SectionCard
          title="Add New Company"
          description="Create the tenant record and warehouse profile that the BOL, routes, and labels will use."
        >
          <form action={createCompanyAction} className="legacy-form-grid">
            <label className="field">
              <span>Company Name</span>
              <input name="name" placeholder="Healtea" required />
            </label>
            <label className="field">
              <span>Company Slug</span>
              <input name="slug" placeholder="healtea" required />
            </label>
            <label className="field">
              <span>Warehouse Name</span>
              <input name="warehouseName" placeholder="Healtea Distribution" />
            </label>
            <label className="field">
              <span>Warehouse Phone</span>
              <input name="warehousePhone" placeholder="2013301900" />
            </label>
            <label className="field field--wide">
              <span>Warehouse Address</span>
              <input name="warehouseAddress1" placeholder="2820 16th Street, Building C" />
            </label>
            <label className="field">
              <span>Warehouse City</span>
              <input name="warehouseCity" placeholder="North Bergen" />
            </label>
            <label className="field">
              <span>Warehouse State</span>
              <input name="warehouseState" placeholder="NJ" />
            </label>
            <label className="field">
              <span>Warehouse Zip</span>
              <input name="warehousePostalCode" placeholder="07047" />
            </label>
            <label className="field">
              <span>Country</span>
              <input name="warehouseCountry" placeholder="US" defaultValue="US" />
            </label>
            <label className="field">
              <span>FOB</span>
              <input name="warehouseFob" placeholder="D" />
            </label>
            <div className="field field--wide form-actions">
              <button className="button" type="submit">
                Submit Form
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Companies List"
          description="This gives us the same admin visibility the old login had after sign-in and before tenant selection."
        >
          <SimpleTable
            columns={[
              { key: "name", label: "Company" },
              { key: "slug", label: "Slug" },
              { key: "warehouse", label: "Warehouse" },
              { key: "users", label: "Users" },
              { key: "customers", label: "Customers" },
              { key: "shipments", label: "Shipments" }
            ]}
            rows={rows}
            emptyMessage="No companies found."
          />
        </SectionCard>
      </div>
    </>
  );
}
