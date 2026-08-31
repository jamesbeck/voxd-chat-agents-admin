import H1 from "@/components/adminui/H1";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import SessionsTable from "./sessionsTable";
import SessionsActions from "./sessionsActions";
import { verifyAccessToken } from "@/lib/auth/verifyToken";

export default async function Page() {
  const token = await verifyAccessToken();

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Sessions" },
        ]}
      />
      <div className="flex items-center justify-between">
        <H1 className="border-b-0 pb-0">All Sessions</H1>
        {token.superAdmin && <SessionsActions />}
      </div>

      <SessionsTable superAdmin={!!token.superAdmin} />
    </Container>
  );
}
