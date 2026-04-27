import { CustomerResolutionDemo } from "@/components/customer-resolution-demo";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { createCustomerAction } from "@/lib/server/dispatch-actions";
import { getCustomersData } from "@/lib/server/dispatch-service";

export default async function CustomersPage() {
  const { customers } = await getCustomersData();

  const rows = customers.map((customer) => ({
    code: customer.customerCode,
    name: customer.name,
    city: customer.city ?? "-",
    state: customer.state ?? "-",
    postalCode: customer.postalCode ?? "-",
    terms: customer.freightTerms ?? "-"
  }));

  return (
    <>
      <PageHeader
        eyebrow="CDS + customer lookup"
        title="Customer Management"
        description="This is the tenant-safe replacement for the worksheet customer list and the old customer maintenance screens."
      />

      <div className="split-grid">
        <SectionCard
          title="Customer Directory"
          description="Each tenant keeps its own customer codes, addresses, and freight terms."
        >
          <SimpleTable
            columns={[
              { key: "code", label: "Code" },
              { key: "name", label: "Name" },
              { key: "city", label: "City" },
              { key: "state", label: "State" },
              { key: "postalCode", label: "Postal Code" },
              { key: "terms", label: "Freight Terms" }
            ]}
            rows={rows}
            emptyMessage="No customers have been added for this tenant yet."
          />
        </SectionCard>

        <SectionCard
          title="Add Customer"
          description="This form writes directly to the tenant-scoped customer table."
        >
          <form action={createCustomerAction} className="field-grid">
            <label className="field">
              <span>Customer code</span>
              <input name="customerCode" placeholder="WG" required />
            </label>
            <label className="field">
              <span>Name</span>
              <input name="name" placeholder="WG Pro-Manufacturing Inc" required />
            </label>
            <label className="field field--wide">
              <span>Billing address</span>
              <input name="billingAddress1" placeholder="10 Auction Lane" required />
            </label>
            <label className="field">
              <span>City</span>
              <input name="city" placeholder="Brampton" required />
            </label>
            <label className="field">
              <span>State / Province</span>
              <input name="state" placeholder="ON" required />
            </label>
            <label className="field">
              <span>Postal code</span>
              <input name="postalCode" placeholder="L6T5V8" required />
            </label>
            <label className="field">
              <span>Country</span>
              <input name="country" placeholder="CA" defaultValue="US" />
            </label>
            <label className="field">
              <span>Phone</span>
              <input name="phone" placeholder="9057903377" />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="logistics@example.com" />
            </label>
            <label className="field">
              <span>Freight terms</span>
              <select name="freightTerms" defaultValue="prepaid">
                <option value="prepaid">Prepaid</option>
                <option value="collect">Collect</option>
                <option value="third-party">Third Party</option>
              </select>
            </label>
            <div className="field field--wide form-actions">
              <button className="button" type="submit">
                Save customer
              </button>
            </div>
          </form>
        </SectionCard>
      </div>

      <SectionCard
        title="Closest Match Preview"
        description="This is the lookup logic that will drive the future add-or-select popup when a dispatcher types a customer that does not exist."
      >
        <CustomerResolutionDemo customers={customers} />
      </SectionCard>
    </>
  );
}
