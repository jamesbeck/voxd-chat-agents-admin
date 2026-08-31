import EditKnowledgeSourceForm from "./editKnowledgeSourceForm";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import H1 from "@/components/adminui/H1";
import Container from "@/components/adminui/Container";
import { notFound, redirect } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import db from "@/database/db";
import KnowledgeSourceActions from "./knowledgeSourceActions";

export default async function KnowledgeSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    redirect("/");
  }

  const knowledgeSource = await db("knowledgeSource").where("id", id).first();

  if (!knowledgeSource) return notFound();

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Knowledge Sources", href: "/knowledge-sources" },
          { label: knowledgeSource.name },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <H1>{knowledgeSource.name}</H1>
        <KnowledgeSourceActions
          knowledgeSourceId={knowledgeSource.id}
          name={knowledgeSource.name}
        />
      </div>

      <EditKnowledgeSourceForm
        id={knowledgeSource.id}
        name={knowledgeSource.name}
        description={knowledgeSource.description}
        setupHours={knowledgeSource.setupHours}
      />
    </Container>
  );
}
