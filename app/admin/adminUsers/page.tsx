import Link from "next/link";
import H1 from "@/components/adminui/H1";
import AdminUsersTable from "./adminUserTable";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import { Button } from "@/components/ui/button";
import { hasAdminUserPermission } from "@/lib/adminUserPermissions";
import { verifyAccessToken } from "@/lib/auth/verifyToken";

export default async function Page() {
  const token = await verifyAccessToken();
  const canWriteUsers =
    token.superAdmin ||
    (await hasAdminUserPermission({
      adminUserId: token.adminUserId,
      permissionKey: "write_users",
    }));

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[{ label: "Admin", href: "/" }, { label: "Users" }]}
      />
      <H1>Admin Users</H1>
      <p>These are users that can log in and manage your agents.</p>

      {canWriteUsers && (
        <div className="flex justify-end">
          <Button asChild>
            <Link href="/adminUsers/new">New User</Link>
          </Button>
        </div>
      )}

      <AdminUsersTable />
    </Container>
  );
}
