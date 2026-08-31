import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { notFound } from "next/navigation";
import Container from "@/components/adminui/Container";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import H1 from "@/components/adminui/H1";
import WebhooksTable from "./webhooksTable";

export default async function WebhooksPage() {
  const token = await verifyAccessToken();

  if (!token.superAdmin) {
    return notFound();
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Webhooks" },
        ]}
      />
      <H1>Received Webhooks</H1>
      <p className="mb-6 text-muted-foreground">
        View inbound webhook receipts, processing status, and delivery results.
      </p>
      <WebhooksTable />
    </Container>
  );
}
