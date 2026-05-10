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
    address: customer.billingAddress1 ?? "-",
    city: customer.city ?? "-",
    postalCode: customer.postalCode ?? "-",
    tel: customer.phone ?? "-",
    email: customer.email ?? "-"
  }));

  return (
    <>
      <PageHeader
        eyebrow="Customer"
        title="Customer Info"
        description="This follows the original customer flow more closely: create the customer, keep the ship-to details with it, then reuse the code during packing slip and BOL work."
      />

      <div className="legacy-page-grid">
        <SectionCard
          title="Use Form Input"
          description="The old customer page captured both billing and ship-to details. This rebuild keeps both so the BOL has the right destination data."
        >
          <form action={createCustomerAction} className="legacy-form-grid">
            <label className="field">
              <span>Customer No</span>
              <input name="customerCode" placeholder="WG" required />
            </label>
            <label className="field">
              <span>Freight 3rd Party</span>
              <select name="freightTerms" defaultValue="prepaid">
                <option value="prepaid">Prepaid</option>
                <option value="collect">Collect</option>
                <option value="third-party">Yes</option>
              </select>
            </label>
            <label className="field">
              <span>Name</span>
              <input name="name" placeholder="WG Pro-Manufacturing Inc" required />
            </label>
            <label className="field">
              <span>Comments</span>
              <input name="shipToCode" placeholder="Optional ship-to code" />
            </label>
            <label className="field">
              <span>Country</span>
              <input name="country" placeholder="CA" defaultValue="US" />
            </label>
            <label className="field">
              <span>Ship To Name</span>
              <input name="shipToName" placeholder="WG Pro-Manufacturing Inc" />
            </label>
            <label className="field field--wide">
              <span>Address</span>
              <input name="billingAddress1" placeholder="10 Auction Lane" required />
            </label>
            <label className="field field--wide">
              <span>Ship To Address</span>
              <input name="shipToAddress1" placeholder="10 Auction Lane" />
            </label>
            <label className="field">
              <span>City</span>
              <input name="city" placeholder="Brampton" required />
            </label>
            <label className="field">
              <span>Ship To City</span>
              <input name="shipToCity" placeholder="Brampton" />
            </label>
            <label className="field">
              <span>Zipcode</span>
              <input name="postalCode" placeholder="L6T5V8" required />
            </label>
            <label className="field">
              <span>Ship To Zip</span>
              <input name="shipToPostalCode" placeholder="L6T5V8" />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="logistics@example.com" />
            </label>
            <label className="field">
              <span>Ship To Email</span>
              <input name="shipToEmail" type="email" placeholder="receiving@example.com" />
            </label>
            <label className="field">
              <span>Phone Number</span>
              <input name="phone" placeholder="9057903377" />
            </label>
            <label className="field">
              <span>Ship To Phone</span>
              <input name="shipToPhone" placeholder="9057903377" />
            </label>
            <label className="field">
              <span>State</span>
              <input name="state" placeholder="ON" required />
            </label>
            <label className="field">
              <span>Ship To State</span>
              <input name="shipToState" placeholder="ON" />
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
          title="Customer List"
          description="This keeps the lookup table close to the old customer screen so operators can scan codes and addresses quickly."
        >
          <SimpleTable
            columns={[
              { key: "code", label: "Customer number" },
              { key: "name", label: "Name" },
              { key: "address", label: "Address" },
              { key: "city", label: "City" },
              { key: "postalCode", label: "Zipcode" },
              { key: "tel", label: "Tel" },
              { key: "email", label: "Email" }
            ]}
            rows={rows}
            emptyMessage="No customers have been added for this tenant yet."
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Closest Match Preview"
        description="This preserves the add-or-select behavior you wanted when a dispatcher types a customer that does not exist."
      >
        <CustomerResolutionDemo customers={customers} />
      </SectionCard>
    </>
  );
}
