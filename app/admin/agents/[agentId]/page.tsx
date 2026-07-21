import SessionsTable from "./sessionsTable";
import getAgentById from "@/lib/getAgentById";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import H1 from "@/components/adminui/H1";
import Container from "@/components/adminui/Container";
import { TabsContent } from "@/components/ui/tabs";
import RecordTabs, { RecordTab } from "@/components/admin/RecordTabs";
import H2 from "@/components/adminui/H2";
import { notFound } from "next/navigation";
import NewAgentForm from "./newAgentForm";
import AgentActions from "./agentActions";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import UsersTable from "./usersTable";
import userCanViewAgent from "@/lib/userCanViewAgent";
import Link from "next/link";
import Dashboard from "./dashboard";
import EditAgentForm from "./editAgentForm";
import DataCard, { DataItem } from "@/components/adminui/DataCard";
import DocumentsCards from "./documentsCards";
import NewDocumentForm from "./newDocumentForm";
import PartialPromptsTable from "./partialPromptsTable";
import NewPartialPromptForm from "./newPartialPromptForm";
import TemplatesSentTable from "./templatesSentTable";
import TemplateHistoryTable from "./templateHistoryTable";
import { Button } from "@/components/ui/button";
import saGetTicketsByAgentId from "@/actions/saGetTicketsByAgentId";
import {
  Bot,
  Cpu,
  Phone,
  Building2,
  MessageSquare,
  History,
  Clock,
  BookOpen,
  FileText,
} from "lucide-react";
import ModelTab from "./modelTab";
import AgentConfigTab from "./AgentConfigTab";
import { hasAdminUserPermission } from "@/lib/adminUserPermissions";
import saGetAllModels from "@/actions/saGetAllModels";
import AgentDomainsTab from "./AgentDomainsTab";
import BillingTab from "./billingTab";
import WebhooksTable from "@/app/admin/webhooks/webhooksTable";
import getPartnerAncestorMarkupMultipliers from "@/lib/getPartnerAncestorMarkupMultipliers";
import saCheckEmbeddingCompatibility from "@/actions/saCheckEmbeddingCompatibility";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import RegenerateAffectedEmbeddingsButton from "./regenerateAffectedEmbeddingsButton";

const applyMarkup = (
  value: number | string | null | undefined,
  multiplier: number,
): number | null => {
  if (value == null) {
    return null;
  }

  return Number((Number(value) * multiplier).toFixed(2));
};

const normalizeDateString = (value: Date | string | null | undefined) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return value.slice(0, 10);
};

export default async function Page({
  params,
  searchParams,
}: {
  params: { agentId: string };
  searchParams: { tab?: string };
}) {
  const agentId = (await params).agentId;
  const activeTab = (await searchParams).tab || "info";

  let agent;

  if (agentId && agentId != "new")
    agent = await getAgentById({ agentId: agentId });

  if (!agent && agentId !== "new") return notFound();

  //get the user
  const token = await verifyAccessToken();

  //can the user view this agent?
  if (!(await userCanViewAgent({ agentId: agentId!, accessToken: token }))) {
    return notFound();
  }

  const canReadAgentConfig =
    !!token.superAdmin ||
    (await hasAdminUserPermission({
      adminUserId: token.adminUserId,
      permissionKey: "read_agent_config",
      agentId,
    }));

  const canWriteAgentConfig =
    canReadAgentConfig &&
    (!!token.superAdmin ||
      (await hasAdminUserPermission({
        adminUserId: token.adminUserId,
        permissionKey: "write_agent_config",
        agentId,
      })));

  const isSuperAdmin = !!token.superAdmin;

  const normalizedActiveTab =
    activeTab === "templates-sent" ? "send-template" : activeTab;

  const resolvedActiveTab =
    normalizedActiveTab === "config" && !canReadAgentConfig
      ? "info"
      : normalizedActiveTab === "domains" && !isSuperAdmin
        ? "info"
        : normalizedActiveTab === "webhooks" && !isSuperAdmin
          ? "info"
          : normalizedActiveTab;

  // Fetch tickets for this agent
  const ticketsResponse = await saGetTicketsByAgentId({ agentId });
  const tickets = ticketsResponse.success ? ticketsResponse.data : [];
  const modelsResponse = await saGetAllModels();
  const models = modelsResponse.success ? modelsResponse.data : [];
  const billingMarkupMultipliers =
    agent && token.partner
      ? await getPartnerAncestorMarkupMultipliers({
          partnerId: agent.directPartnerId,
        })
      : null;
  const showVoxdMonthlyFee = isSuperAdmin || !!token.partner;
  const displayedVoxdMonthlyFee = isSuperAdmin
    ? (agent?.voxdMonthlyFee ?? null)
    : token.partner
      ? applyMarkup(
          agent?.voxdMonthlyFee,
          billingMarkupMultipliers?.monthlyFeeMultiplier ?? 1,
        )
      : null;
  const displayedRetailMonthlyFee = agent?.retailMonthlyFee ?? null;
  const billingPartnerName =
    (token.partner ? token.organisationName : null) ||
    agent?.directPartnerName ||
    "Partner";
  const voxdMonthlyFeeDescription = `What ${agent?.parentPartnerName || "Voxd"} charges ${billingPartnerName} every month for this agent.`;
  const retailMonthlyFeeDescription = `What ${billingPartnerName} charges ${agent?.organisationName || "this organisation"} for this agent.`;
  const billingStartDateDescription =
    "The date billing started, and the date each month it will be charged.";

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Agents", href: "/admin/agents" },
          { label: agent?.niceName || "New Agent" },
        ]}
      />
      <H1>{agent?.niceName || "New Agent"}</H1>
      {agent && (
        <>
          <RecordTabs
            value={resolvedActiveTab}
            tabs={
              [
                {
                  value: "info",
                  label: "Info",
                  href: `/admin/agents/${agentId}?tab=info`,
                },
                {
                  value: "dashboard",
                  label: "Dashboard",
                  href: `/admin/agents/${agentId}?tab=dashboard`,
                },
                ...(token.superAdmin
                  ? [
                      {
                        value: "edit",
                        label: "Edit Agent",
                        href: `/admin/agents/${agentId}?tab=edit`,
                      },
                    ]
                  : []),
                {
                  value: "model",
                  label: "Model",
                  href: `/admin/agents/${agentId}?tab=model`,
                },
                {
                  value: "billing",
                  label: "Billing",
                  href: `/admin/agents/${agentId}?tab=billing`,
                },
                ...(isSuperAdmin
                  ? [
                      {
                        value: "domains",
                        label: "Domains",
                        href: `/admin/agents/${agentId}?tab=domains`,
                      },
                    ]
                  : []),
                {
                  value: "sessions",
                  label: "Sessions",
                  href: `/admin/agents/${agentId}?tab=sessions`,
                },
                ...(isSuperAdmin
                  ? [
                      {
                        value: "webhooks",
                        label: "Webhooks",
                        href: `/admin/agents/${agentId}?tab=webhooks`,
                      },
                    ]
                  : []),
                {
                  value: "users",
                  label: "Users",
                  href: `/admin/agents/${agentId}?tab=users`,
                },
                {
                  value: "send-template",
                  label: "Queue Template",
                  href: `/admin/agents/${agentId}?tab=send-template`,
                },
                {
                  value: "template-history",
                  label: "Template History",
                  href: `/admin/agents/${agentId}?tab=template-history`,
                },
                {
                  value: "knowledge",
                  label: "Knowledge",
                  href: `/admin/agents/${agentId}?tab=knowledge`,
                },
                {
                  value: "partial-prompts",
                  label: "Partial Prompts",
                  href: `/admin/agents/${agentId}?tab=partial-prompts`,
                },
                ...(canReadAgentConfig
                  ? [
                      {
                        value: "config",
                        label: "Config",
                        href: `/admin/agents/${agentId}?tab=config`,
                      },
                    ]
                  : []),
              ] satisfies RecordTab[]
            }
            actions={
              <AgentActions
                agentId={agentId}
                name={agent?.name || ""}
                niceName={agent?.niceName || ""}
                phoneNumber={agent?.phoneNumber || ""}
                organisationId={agent?.organisationId || ""}
                tickets={tickets || []}
                isSuperAdmin={!!token.superAdmin}
              />
            }
          >
            <TabsContent value="info">
              <Container>
                <DataCard
                  items={
                    [
                      {
                        label: "Agent Name",
                        value: agent.name,
                        icon: <Bot className="h-4 w-4" />,
                      },
                      {
                        label: "Model",
                        value: `${agent.provider} / ${agent.model}`,
                        icon: <Cpu className="h-4 w-4" />,
                      },
                      agent.displayPhoneNumber
                        ? {
                            label: "Phone Number",
                            value: agent.displayPhoneNumber,
                            icon: <Phone className="h-4 w-4" />,
                          }
                        : null,
                      agent.organisationName
                        ? {
                            label: "Organisation",
                            value: agent.organisationName,
                            icon: <Building2 className="h-4 w-4" />,
                          }
                        : null,
                      agent.targetMessageLengthCharacters
                        ? {
                            label: "Target Message Length",
                            value: `${agent.targetMessageLengthCharacters} characters`,
                            icon: <MessageSquare className="h-4 w-4" />,
                          }
                        : null,
                      agent.maxMessageHistory
                        ? {
                            label: "Max Message History",
                            value: agent.maxMessageHistory,
                            icon: <History className="h-4 w-4" />,
                          }
                        : null,
                      agent.autoCloseSessionAfterSeconds
                        ? {
                            label: "Auto Close Session After",
                            value: `${agent.autoCloseSessionAfterSeconds} seconds`,
                            icon: <Clock className="h-4 w-4" />,
                          }
                        : null,
                    ].filter(Boolean) as DataItem[]
                  }
                />
              </Container>
            </TabsContent>
            <TabsContent value="dashboard">
              <Container>
                <H2>Dashboard</H2>
                <Dashboard agentId={agentId} />
              </Container>
            </TabsContent>
            {!!token.superAdmin && (
              <TabsContent value="edit">
                <Container>
                  <H2>Edit Agent</H2>
                  <EditAgentForm
                    agentId={agentId}
                    name={agent?.name}
                    niceName={agent?.niceName}
                    organisationId={agent?.organisationId}
                    organisationName={agent?.organisationName}
                    phoneNumberId={agent?.phoneNumberId}
                    phoneNumberDisplay={
                      agent?.displayPhoneNumber && agent?.verifiedName
                        ? `${agent.displayPhoneNumber} ${agent.verifiedName}`
                        : agent?.displayPhoneNumber
                    }
                    codeDirectory={agent?.codeDirectory}
                    targetMessageLengthCharacters={
                      agent?.targetMessageLengthCharacters
                    }
                    maxMessageHistory={agent?.maxMessageHistory}
                    autoCloseSessionAfterSeconds={
                      agent?.autoCloseSessionAfterSeconds
                    }
                  />
                </Container>
              </TabsContent>
            )}
            <TabsContent value="model">
              <Container>
                <ModelTab
                  agentId={agentId}
                  organisationId={agent?.organisationId}
                  currentModelId={agent?.modelId}
                  currentEmbeddingModelId={agent?.embeddingModelId}
                  currentProviderApiKeyId={agent?.providerApiKeyId}
                  currentEmbeddingProviderApiKeyId={
                    agent?.embeddingProviderApiKeyId
                  }
                />
              </Container>
            </TabsContent>
            <TabsContent value="billing">
              <Container>
                <H2>Billing</H2>
                <p className="text-muted-foreground mb-4">
                  Review the recurring billing details for this agent.
                </p>
                <BillingTab
                  agentId={agentId}
                  canEdit={isSuperAdmin}
                  showVoxdMonthlyFee={showVoxdMonthlyFee}
                  voxdMonthlyFee={displayedVoxdMonthlyFee}
                  retailMonthlyFee={displayedRetailMonthlyFee}
                  billingStartDate={normalizeDateString(
                    agent?.billingStartDate,
                  )}
                  voxdMonthlyFeeDescription={voxdMonthlyFeeDescription}
                  retailMonthlyFeeDescription={retailMonthlyFeeDescription}
                  billingStartDateDescription={billingStartDateDescription}
                />
              </Container>
            </TabsContent>
            {isSuperAdmin && (
              <TabsContent value="domains">
                <Container>
                  <H2>Embed Domains</H2>
                  <p className="text-muted-foreground mb-4">
                    Manage the production and development domain allowlists for
                    the webchat embed.
                  </p>
                  <AgentDomainsTab
                    agentId={agentId}
                    domains={agent?.domains}
                    developmentDomains={agent?.developmentDomains}
                  />
                </Container>
              </TabsContent>
            )}
            <TabsContent value="sessions">
              <Container>
                <H2>Sessions</H2>
                <SessionsTable
                  agentId={agentId}
                  superAdmin={!!token.superAdmin}
                />
              </Container>
            </TabsContent>
            {isSuperAdmin && (
              <TabsContent value="webhooks">
                <Container>
                  <H2>Received Webhooks</H2>
                  <p className="mb-4 text-muted-foreground">
                    Review inbound webhook receipts for this agent only.
                  </p>
                  <WebhooksTable agentId={agentId} />
                </Container>
              </TabsContent>
            )}
            <TabsContent value="users">
              <Container>
                <H2>Chat Users</H2>
                <p>
                  Chat users that have ever interacted with this agent are
                  listed below.
                </p>
                <UsersTable
                  agentId={agentId}
                  userDataSchema={agent?.userDataSchema}
                />
              </Container>
            </TabsContent>
            <TabsContent value="send-template">
              <Container>
                <H2>Queue Template</H2>
                <p className="text-muted-foreground mb-4">
                  Queue WhatsApp templates to saved groups for this agent.
                </p>
                <TemplatesSentTable agentId={agentId} />
              </Container>
            </TabsContent>
            <TabsContent value="template-history">
              <Container>
                <H2>Template History</H2>
                <p className="text-muted-foreground mb-4">
                  Review grouped template sends and drill into the individual
                  messages that were sent.
                </p>
                <TemplateHistoryTable agentId={agentId} />
              </Container>
            </TabsContent>
            <TabsContent value="knowledge">
              <Container>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <H2>Knowledge Documents</H2>
                    <p className="text-muted-foreground">
                      Manage knowledge documents that the agent can use to
                      answer questions.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/admin/agents/${agentId}?tab=new-document`}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      New Document
                    </Link>
                  </Button>
                </div>
                <EmbeddingCompatibilityWarning agentId={agentId} />
                <DocumentsCards agentId={agentId} />
              </Container>
            </TabsContent>
            <TabsContent value="new-document">
              <Container>
                <H2>New Knowledge Document</H2>
                <p className="text-muted-foreground mb-4">
                  Create a new knowledge document for this agent.
                </p>
                <NewDocumentForm agentId={agentId} />
              </Container>
            </TabsContent>
            <TabsContent value="partial-prompts">
              <Container>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <H2>Partial Prompts</H2>
                    <p className="text-muted-foreground">
                      Manage prompt snippets that can be included in the
                      agent&apos;s system prompt.
                    </p>
                  </div>
                  {!!token.superAdmin && (
                    <Button asChild>
                      <Link
                        href={`/admin/agents/${agentId}?tab=new-partial-prompt`}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        New Partial Prompt
                      </Link>
                    </Button>
                  )}
                </div>
                <PartialPromptsTable agentId={agentId} />
              </Container>
            </TabsContent>
            {!!token.superAdmin && (
              <TabsContent value="new-partial-prompt">
                <Container>
                  <H2>New Partial Prompt</H2>
                  <p className="text-muted-foreground mb-4">
                    Create a new partial prompt for this agent.
                  </p>
                  <NewPartialPromptForm agentId={agentId} />
                </Container>
              </TabsContent>
            )}
            {canReadAgentConfig && (
              <TabsContent value="config">
                <Container>
                  <H2>Agent Config</H2>
                  <AgentConfigTab
                    agentId={agentId}
                    config={agent.config}
                    configSchema={agent.configSchema}
                    testConfig={agent.testConfig}
                    testConfigSchema={agent.testConfigSchema}
                    canEdit={canWriteAgentConfig}
                  />
                </Container>
              </TabsContent>
            )}
          </RecordTabs>
        </>
      )}
      {!agent && <NewAgentForm models={models} />}
    </Container>
  );
}

async function EmbeddingCompatibilityWarning({ agentId }: { agentId: string }) {
  const result = await saCheckEmbeddingCompatibility({ agentId });
  if (!result.success || !result.data || result.data.incompatibleCount === 0)
    return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Incompatible Embeddings</AlertTitle>
      <AlertDescription>
        <p>
          {result.data.incompatibleCount} knowledge block
          {result.data.incompatibleCount === 1
            ? " has an embedding"
            : "s have embeddings"}{" "}
          generated by a different model than the agent&apos;s current embedding
          model ({result.data.currentModel}). These blocks will not appear in
          search results. Regenerate the affected document embeddings to fix
          this.
        </p>
        <div className="mt-2">
          <RegenerateAffectedEmbeddingsButton
            agentId={agentId}
            incompatibleCount={result.data.incompatibleCount}
          />
        </div>
      </AlertDescription>
    </Alert>
  );
}
