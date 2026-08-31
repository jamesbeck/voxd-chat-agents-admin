import H1 from "@/components/adminui/H1";
import IntegrationsPageContent from "./integrationsPageContent";
import Container from "@/components/adminui/Container";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { notFound } from "next/navigation";

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
          { label: "Integrations" },
        ]}
      />
      <H1>Integrations</H1>

      <IntegrationsPageContent />
    </Container>
  );
}
