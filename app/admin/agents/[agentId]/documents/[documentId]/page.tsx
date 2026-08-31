import getDocumentById from "@/lib/getDocumentById";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import H1 from "@/components/adminui/H1";
import Container from "@/components/adminui/Container";
import { TabsContent } from "@/components/ui/tabs";
import RecordTabs from "@/components/admin/RecordTabs";
import H2 from "@/components/adminui/H2";
import { notFound } from "next/navigation";
import userCanViewAgent from "@/lib/userCanViewAgent";
import Link from "next/link";
import DataCard, { DataItem } from "@/components/adminui/DataCard";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Link as LinkIcon,
  Calendar,
  CheckCircle,
  XCircle,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import EditDocumentForm from "./editDocumentForm";
import DocumentActions from "./documentActions";
import KnowledgeBlocksTable from "./knowledgeBlocksTable";
import NewKnowledgeBlockForm from "./newKnowledgeBlockForm";
import SmartImportForm from "./smartImportKnowledgeBlocksForm";
import RegenerateEmbeddingsButton from "./regenerateEmbeddingsButton";
import RefreshDocumentFromUrlButton from "./refreshDocumentFromUrlButton";
import {
  getKnowledgeDocumentSourceLabel,
  knowledgeDocumentBlocksAreEditable,
} from "@/lib/knowledgeDocumentSource";
import saCheckEmbeddingCompatibility from "@/actions/saCheckEmbeddingCompatibility";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function Page({
  params,
  searchParams,
}: {
  params: { agentId: string; documentId: string };
  searchParams: { tab?: string };
}) {
  const { agentId, documentId } = await params;
  const requestedTab = (await searchParams).tab || "info";

  const document = await getDocumentById({ documentId });

  if (!document) return notFound();

  // Verify the user can view this agent
  if (!(await userCanViewAgent({ agentId }))) {
    return notFound();
  }

  const blocksAreEditable = knowledgeDocumentBlocksAreEditable(
    document.sourceType,
  );
  const activeTab =
    !blocksAreEditable && ["new-block", "smart-import"].includes(requestedTab)
      ? "knowledge-blocks"
      : requestedTab;

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Agents", href: "/agents" },
          {
            label: document.agentNiceName || "Agent",
            href: `/agents/${agentId}`,
          },
          {
            label: "Knowledge",
            href: `/agents/${agentId}?tab=knowledge`,
          },
          { label: document.title },
        ]}
      />
      <H1>{document.title}</H1>

      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "info",
            label: "Info",
            href: `/agents/${agentId}/documents/${documentId}?tab=info`,
          },
          {
            value: "edit",
            label: "Edit",
            href: `/agents/${agentId}/documents/${documentId}?tab=edit`,
          },
          {
            value: "knowledge-blocks",
            label: "Knowledge Blocks",
            href: `/agents/${agentId}/documents/${documentId}?tab=knowledge-blocks`,
          },
        ]}
        actions={
          <DocumentActions
            documentId={documentId}
            documentTitle={document.title}
            agentId={agentId}
            organisationId={document.organisationId}
          />
        }
      >
        <TabsContent value="info">
          <Container>
            <DataCard
              items={
                [
                  {
                    label: "Title",
                    value: document.title,
                    icon: <FileText className="h-4 w-4" />,
                  },
                  document.description
                    ? {
                        label: "Description",
                        value: document.description,
                        icon: <FileText className="h-4 w-4" />,
                      }
                    : null,
                  document.sourceType
                    ? {
                        label: "Source Type",
                        value: getKnowledgeDocumentSourceLabel(
                          document.sourceType,
                        ),
                        icon: <Layers className="h-4 w-4" />,
                      }
                    : null,
                  document.sourceUrl
                    ? {
                        label: "Source URL",
                        value: document.sourceUrl,
                        icon: <LinkIcon className="h-4 w-4" />,
                      }
                    : null,
                  {
                    label: "Enabled",
                    value: document.enabled ? "Yes" : "No",
                    icon: document.enabled ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ),
                  },
                  {
                    label: "Created",
                    value: format(
                      new Date(document.createdAt),
                      "dd/MM/yyyy HH:mm",
                    ),
                    icon: <Calendar className="h-4 w-4" />,
                  },
                  {
                    label: "Updated",
                    value: format(
                      new Date(document.updatedAt),
                      "dd/MM/yyyy HH:mm",
                    ),
                    icon: <Calendar className="h-4 w-4" />,
                  },
                ].filter(Boolean) as DataItem[]
              }
            />
          </Container>
        </TabsContent>

        <TabsContent value="edit">
          <Container>
            <H2>Edit Document</H2>
            <EditDocumentForm
              documentId={documentId}
              title={document.title}
              description={document.description}
              prompt={document.prompt}
              sourceUrl={document.sourceUrl}
              sourceType={document.sourceType}
              enabled={document.enabled}
            />
          </Container>
        </TabsContent>

        <TabsContent value="knowledge-blocks">
          <Container>
            <div className="flex items-center justify-between mb-4">
              <div>
                <H2>Knowledge Blocks</H2>
                <p className="text-muted-foreground">
                  {blocksAreEditable
                    ? "Knowledge blocks are segments of the document used for semantic search."
                    : "Knowledge blocks in URL-backed documents are generated from the source URL and refreshed as a set."}
                </p>
              </div>
              <div className="flex gap-2">
                {blocksAreEditable ? (
                  <>
                    <RegenerateEmbeddingsButton
                      documentId={documentId}
                      documentTitle={document.title}
                    />
                    <Button asChild>
                      <Link
                        href={`/agents/${agentId}/documents/${documentId}?tab=smart-import`}
                      >
                        <Layers className="h-4 w-4 mr-2" />
                        Smart Import (AI)
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link
                        href={`/agents/${agentId}/documents/${documentId}?tab=new-block`}
                      >
                        <Layers className="h-4 w-4 mr-2" />
                        New Block
                      </Link>
                    </Button>
                  </>
                ) : (
                  <RefreshDocumentFromUrlButton
                    documentId={documentId}
                    documentTitle={document.title}
                    sourceUrl={document.sourceUrl}
                  />
                )}
              </div>
            </div>
            <DocumentEmbeddingWarning
              agentId={agentId}
              documentId={documentId}
            />
            <KnowledgeBlocksTable documentId={documentId} agentId={agentId} />
          </Container>
        </TabsContent>

        {blocksAreEditable && (
          <TabsContent value="new-block">
            <Container>
              <H2>New Knowledge Block</H2>
              <p className="text-muted-foreground mb-4">
                Create a new knowledge block. The embedding will be generated
                automatically.
              </p>
              <NewKnowledgeBlockForm
                documentId={documentId}
                agentId={agentId}
              />
            </Container>
          </TabsContent>
        )}

        {blocksAreEditable && (
          <TabsContent value="smart-import">
            <Container>
              <H2>Smart Import (AI)</H2>
              <p className="text-muted-foreground mb-4">
                Paste text and the agent&apos;s AI model will intelligently
                split it into semantic knowledge blocks with auto-generated
                titles.
              </p>
              <SmartImportForm documentId={documentId} />
            </Container>
          </TabsContent>
        )}
      </RecordTabs>
    </Container>
  );
}

async function DocumentEmbeddingWarning({
  agentId,
  documentId,
}: {
  agentId: string;
  documentId: string;
}) {
  const result = await saCheckEmbeddingCompatibility({ agentId, documentId });
  if (!result.success || !result.data || result.data.incompatibleCount === 0)
    return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Incompatible Embeddings</AlertTitle>
      <AlertDescription>
        {result.data.incompatibleCount} knowledge block
        {result.data.incompatibleCount === 1
          ? " has an embedding"
          : "s have embeddings"}{" "}
        in this document generated by a different model than the agent&apos;s
        current embedding model ({result.data.currentModel}). These blocks will
        not appear in search results. Regenerate this document&apos;s embeddings
        to fix this.
      </AlertDescription>
    </Alert>
  );
}
