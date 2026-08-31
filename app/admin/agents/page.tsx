import Link from "next/link";
import H1 from "@/components/adminui/H1";
import AgentsTable from "./agentsTable";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import { Button } from "@/components/ui/button";
import { verifyAccessToken } from "@/lib/auth/verifyToken";

export default async function Page() {
  const accessToken = await verifyAccessToken();
  const isSuperAdmin = accessToken.superAdmin ?? false;

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[{ label: "Admin", href: "/" }, { label: "Agents" }]}
      />
      <H1>Agents</H1>

      <div className="flex justify-end">
        <Button asChild>
          <Link href="/agents/new">New Agent</Link>
        </Button>
      </div>

      <AgentsTable isSuperAdmin={isSuperAdmin} />
    </Container>
  );
}
