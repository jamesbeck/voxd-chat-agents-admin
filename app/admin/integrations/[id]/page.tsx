import EditIntegrationForm from "./editIntegrationForm";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import H1 from "@/components/adminui/H1";
import Container from "@/components/adminui/Container";
import { notFound, redirect } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import db from "@/database/db";
import IntegrationActions from "./integrationActions";

export default async function IntegrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    redirect("/");
  }

  const integration = await db("integration").where("id", id).first();

  if (!integration) return notFound();

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Integrations", href: "/integrations" },
          { label: integration.name },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <H1>{integration.name}</H1>
        <IntegrationActions
          integrationId={integration.id}
          name={integration.name}
        />
      </div>

      <EditIntegrationForm
        id={integration.id}
        name={integration.name}
        description={integration.description}
        setupHours={integration.setupHours}
      />
    </Container>
  );
}
