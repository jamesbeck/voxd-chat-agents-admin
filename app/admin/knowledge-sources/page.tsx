import H1 from "@/components/adminui/H1";
import KnowledgeSourcesPageContent from "./knowledgeSourcesPageContent";
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
          { label: "Knowledge Sources" },
        ]}
      />
      <H1>Knowledge Sources</H1>

      <KnowledgeSourcesPageContent />
    </Container>
  );
}
