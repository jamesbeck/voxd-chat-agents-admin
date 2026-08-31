import Link from "next/link";
import { notFound } from "next/navigation";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import H1 from "@/components/adminui/H1";
import Container from "@/components/adminui/Container";
import { Button } from "@/components/ui/button";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import PermissionDefinitionsTable from "./permissionDefinitionsTable";

export default async function Page() {
  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    return notFound();
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Permission Definitions" },
        ]}
      />
      <H1>Permission Definitions</H1>

      <div className="flex justify-end">
        <Button asChild>
          <Link href="/permission-definitions/new">New Definition</Link>
        </Button>
      </div>

      <PermissionDefinitionsTable />
    </Container>
  );
}
