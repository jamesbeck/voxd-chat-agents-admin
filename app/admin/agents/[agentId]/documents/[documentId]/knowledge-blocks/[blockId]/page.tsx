import getKnowledgeBlockById from "@/lib/getKnowledgeBlockById";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import H1 from "@/components/adminui/H1";
import Container from "@/components/adminui/Container";
import { notFound } from "next/navigation";
import userCanViewAgent from "@/lib/userCanViewAgent";
import EditKnowledgeBlockForm from "./editKnowledgeBlockForm";
import KnowledgeBlockActions from "./knowledgeBlockActions";
import DataCard, { DataItem } from "@/components/adminui/DataCard";
import {
  FileText,
  Hash,
  Calendar,
  CheckCircle,
  XCircle,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { TabsContent } from "@/components/ui/tabs";
import RecordTabs from "@/components/admin/RecordTabs";
import H2 from "@/components/adminui/H2";
import { knowledgeDocumentBlocksAreEditable } from "@/lib/knowledgeDocumentSource";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string; documentId: string; blockId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { agentId, documentId, blockId } = await params;
  const requestedTab = (await searchParams).tab || "info";

  const block = await getKnowledgeBlockById({ blockId });

  if (!block) return notFound();

  // Verify the user can view this agent
  if (!(await userCanViewAgent({ agentId }))) {
    return notFound();
  }

  const blocksAreEditable = knowledgeDocumentBlocksAreEditable(
    block.documentSourceType,
  );
  const activeTab =
    !blocksAreEditable && requestedTab === "edit" ? "info" : requestedTab;

  const pageTitle = [
    block.documentTitle,
    block.title || `Block ${block.blockIndex}`,
  ]
    .filter(Boolean)
    .join(": ");

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Agents", href: "/agents" },
          {
            label: block.agentNiceName || "Agent",
            href: `/agents/${agentId}`,
          },
          {
            label: "Knowledge",
            href: `/agents/${agentId}?tab=knowledge`,
          },
          {
            label: block.documentTitle || "Document",
            href: `/agents/${agentId}/documents/${documentId}`,
          },
          {
            label: "Knowledge Blocks",
            href: `/agents/${agentId}/documents/${documentId}?tab=knowledge-blocks`,
          },
          { label: `Block ${block.blockIndex}` },
        ]}
      />
      <H1>{pageTitle}</H1>

      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "info",
            label: "Info",
            href: `/agents/${agentId}/documents/${documentId}/knowledge-blocks/${blockId}?tab=info`,
          },
          ...(blocksAreEditable
            ? [
                {
                  value: "edit",
                  label: "Edit",
                  href: `/agents/${agentId}/documents/${documentId}/knowledge-blocks/${blockId}?tab=edit`,
                },
              ]
            : []),
        ]}
        actions={
          <KnowledgeBlockActions
            blockId={blockId}
            blockIndex={block.blockIndex}
            agentId={agentId}
            documentId={documentId}
            canDelete={blocksAreEditable}
          />
        }
      >
        <TabsContent value="info">
          <Container>
            <DataCard
              items={
                [
                  {
                    label: "Block Index",
                    value: block.blockIndex,
                    icon: <Hash className="h-4 w-4" />,
                  },
                  block.title
                    ? {
                        label: "Title",
                        value: block.title,
                        icon: <Layers className="h-4 w-4" />,
                      }
                    : null,
                  {
                    label: "Token Count",
                    value: block.tokenCount || "N/A",
                    icon: <FileText className="h-4 w-4" />,
                  },
                  {
                    label: "Has Embedding",
                    value: block.hasEmbedding ? "Yes" : "No",
                    icon: block.hasEmbedding ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ),
                  },
                  {
                    label: "Created",
                    value: format(
                      new Date(block.createdAt),
                      "dd/MM/yyyy HH:mm",
                    ),
                    icon: <Calendar className="h-4 w-4" />,
                  },
                ].filter(Boolean) as DataItem[]
              }
            />
            <div className="mt-6">
              <H2>Content</H2>
              {!blocksAreEditable && (
                <p className="mt-2 text-sm text-muted-foreground">
                  This block belongs to a URL-backed document. Update the
                  document by refreshing its source URL instead of editing
                  individual blocks.
                </p>
              )}
              <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap font-mono text-sm">
                {block.content}
              </div>
            </div>
          </Container>
        </TabsContent>

        {blocksAreEditable && (
          <TabsContent value="edit">
            <Container>
              <H2>Edit Knowledge Block</H2>
              <p className="text-muted-foreground mb-4">
                Editing the content will regenerate the embedding.
              </p>
              <EditKnowledgeBlockForm
                blockId={blockId}
                documentId={documentId}
                agentId={agentId}
                content={block.content}
                title={block.title}
              />
            </Container>
          </TabsContent>
        )}
      </RecordTabs>
    </Container>
  );
}
