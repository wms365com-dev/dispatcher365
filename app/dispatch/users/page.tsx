import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { createUserAction } from "@/lib/server/dispatch-actions";
import { getUsersData } from "@/lib/server/dispatch-service";

export default async function UsersPage() {
  const { context, memberships, tenants } = await getUsersData();

  const rows = memberships.map((membership) => ({
    user: membership.user.fullName,
    email: membership.user.email,
    company: membership.tenant.name,
    role: membership.role.replaceAll("_", " "),
    created: membership.createdAt.toISOString().slice(0, 10)
  }));

  return (
    <>
      <PageHeader
        eyebrow="User Manage"
        title="Users List"
        description="This brings back the admin-level user management view so we can compare the rebuild from the same vantage point as the old site."
      />

      <div className="legacy-page-grid">
        <SectionCard
          title="Add New User"
          description="Platform admins can add a user and attach them to a tenant and role."
        >
          <form action={createUserAction} className="legacy-form-grid">
            <label className="field">
              <span>Full Name</span>
              <input name="fullName" placeholder="Operations Manager" required />
            </label>
            <label className="field">
              <span>Company</span>
              <select name="tenantSlug" defaultValue={context.tenant.slug}>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.slug}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="user@example.com" required />
            </label>
            <label className="field">
              <span>Role</span>
              <select name="role" defaultValue="DISPATCHER">
                <option value="PLATFORM_ADMIN">Platform Admin</option>
                <option value="TENANT_ADMIN">Tenant Admin</option>
                <option value="DISPATCHER">Dispatcher</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="CUSTOMER_SERVICE">Customer Service</option>
                <option value="DRIVER">Driver</option>
              </select>
            </label>
            <label className="field field--wide">
              <span>Password</span>
              <input name="password" type="password" placeholder="Temporary password" required />
            </label>
            <div className="field field--wide form-actions">
              <button className="button" type="submit">
                Submit Form
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Users List"
          description="This table replaces the old admin grid with the same high-value fields: user, tenant, role, and created date."
        >
          <SimpleTable
            columns={[
              { key: "user", label: "User" },
              { key: "email", label: "Email" },
              { key: "company", label: "Company" },
              { key: "role", label: "Role" },
              { key: "created", label: "Created" }
            ]}
            rows={rows}
            emptyMessage="No users found."
          />
        </SectionCard>
      </div>
    </>
  );
}
