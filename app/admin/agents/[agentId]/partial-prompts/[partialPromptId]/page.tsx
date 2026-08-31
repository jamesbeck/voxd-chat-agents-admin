import getPartialPromptById from "@/lib/getPartialPromptById";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import H1 from "@/components/adminui/H1";
import Container from "@/components/adminui/Container";
import { TabsContent } from "@/components/ui/tabs";
import RecordTabs from "@/components/admin/RecordTabs";
import H2 from "@/components/adminui/H2";
import { notFound } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import userCanViewAgent from "@/lib/userCanViewAgent";
import DataCard, { DataItem } from "@/components/adminui/DataCard";
import { FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import EditPartialPromptForm from "./editPartialPromptForm";
import PartialPromptActions from "./partialPromptActions";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string; partialPromptId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { agentId, partialPromptId } = await params;
  const activeTab = (await searchParams).tab || "info";

  const partialPrompt = await getPartialPromptById({ partialPromptId });

  if (!partialPrompt) return notFound();

  // Verify the user can view this agent
  const token = await verifyAccessToken();
  if (!(await userCanViewAgent({ agentId }))) {
    return notFound();
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Agents", href: "/agents" },
          {
            label: partialPrompt.agentNiceName || "Agent",
            href: `/agents/${agentId}`,
          },
          {
            label: "Partial Prompts",
            href: `/agents/${agentId}?tab=partial-prompts`,
          },
          { label: partialPrompt.name },
        ]}
      />
      <H1>{partialPrompt.name}</H1>

      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "info",
            label: "Info",
            href: `/agents/${agentId}/partial-prompts/${partialPromptId}?tab=info`,
          },
          {
            value: "edit",
            label: "Edit",
            href: `/agents/${agentId}/partial-prompts/${partialPromptId}?tab=edit`,
          },
        ]}
        actions={
          !!token.superAdmin ? (
            <PartialPromptActions
              partialPromptId={partialPromptId}
              partialPromptName={partialPrompt.name}
              agentId={agentId}
            />
          ) : undefined
        }
      >
        <TabsContent value="info">
          <Container>
            <DataCard
              items={
                [
                  {
                    label: "Name",
                    value: partialPrompt.name,
                    icon: <FileText className="h-4 w-4" />,
                  },
                  {
                    label: "Created",
                    value: format(
                      new Date(partialPrompt.createdAt),
                      "dd/MM/yyyy HH:mm",
                    ),
                    icon: <Calendar className="h-4 w-4" />,
                  },
                  {
                    label: "Updated",
                    value: format(
                      new Date(partialPrompt.updatedAt),
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
            <H2>Edit Partial Prompt</H2>
            <EditPartialPromptForm
              partialPromptId={partialPromptId}
              agentId={agentId}
              name={partialPrompt.name}
              text={partialPrompt.text}
            />
          </Container>
        </TabsContent>
      </RecordTabs>
    </Container>
  );
}
