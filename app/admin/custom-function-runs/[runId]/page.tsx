import Link from "next/link";
import { format, formatDistance } from "date-fns";
import { notFound } from "next/navigation";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import DataCard, { DataItem } from "@/components/adminui/DataCard";
import H1 from "@/components/adminui/H1";
import H2 from "@/components/adminui/H2";
import RecordTabs from "@/components/admin/RecordTabs";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { getScopedAgentForAdminUser } from "@/lib/adminUserPermissions";
import getCustomFunctionRunById from "@/lib/getCustomFunctionRunById";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Hash,
  Link as LinkIcon,
  Timer,
  User,
} from "lucide-react";

const formatRunLabel = (value?: string | null) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "-";

export default async function CustomFunctionRunPage({
  params,
  searchParams,
}: {
  params: { runId: string };
  searchParams: { tab?: string };
}) {
  const accessToken = await verifyAccessToken();
  const activeTab = (await searchParams).tab || "details";
  const runId = (await params).runId;

  const run = await getCustomFunctionRunById({ runId });

  if (!run) {
    return notFound();
  }

  const scopedAgent = await getScopedAgentForAdminUser({
    agentId: run.agentId,
    targetAdminUser: {
      superAdmin: accessToken.superAdmin,
      isPartnerUser: accessToken.partner,
      partnerId: accessToken.partnerId,
      organisationId: accessToken.organisationId,
    },
  });

  if (!scopedAgent) {
    return notFound();
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          ...(accessToken.superAdmin
            ? [
                {
                  label: "Custom Function Logs",
                  href: "/custom-function-runs",
                },
              ]
            : [
                { label: "Agents", href: "/agents" },
                {
                  label: run.agentName,
                  href: `/agents/${run.agentId}`,
                },
              ]),
          { label: run.customFunctionName },
        ]}
      />

      <H1 className="mb-4 text-2xl font-semibold">{run.customFunctionName}</H1>

      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "details",
            label: "Details",
            href: `/custom-function-runs/${runId}?tab=details`,
          },
          {
            value: "logs",
            label: `Logs (${run.logs.length})`,
            href: `/custom-function-runs/${runId}?tab=logs`,
          },
        ]}
      >
        <TabsContent value="details">
          <H2>Run Details</H2>
          <DataCard
            items={
              [
                {
                  label: "Run ID",
                  value: run.id,
                  icon: <Hash className="h-4 w-4" />,
                },
                {
                  label: "Agent",
                  value: (
                    <Link
                      href={`/agents/${run.agentId}`}
                      className="text-blue-500 hover:underline"
                    >
                      {run.agentName}
                    </Link>
                  ),
                  icon: <LinkIcon className="h-4 w-4" />,
                },
                {
                  label: "Scope",
                  value: run.targetScope,
                  icon: <User className="h-4 w-4" />,
                },
                {
                  label: "Trigger",
                  value: run.triggerSource,
                  icon: <Activity className="h-4 w-4" />,
                },
                {
                  label: "Status",
                  value: formatRunLabel(run.runStatus),
                  icon: <Activity className="h-4 w-4" />,
                  variant:
                    run.runStatus === "completed"
                      ? "success"
                      : run.runStatus === "failed"
                        ? "danger"
                        : "info",
                },
                {
                  label: "Result",
                  value: formatRunLabel(run.runResult),
                  icon: <CheckCircle className="h-4 w-4" />,
                  variant:
                    run.runResult === "success"
                      ? "success"
                      : run.runResult === "error"
                        ? "danger"
                        : "default",
                },
                {
                  label: "Created At",
                  value: format(run.createdAt, "dd/MM/yyyy HH:mm:ss"),
                  description: formatDistance(run.createdAt, new Date(), {
                    addSuffix: true,
                  }),
                  icon: <Calendar className="h-4 w-4" />,
                },
                {
                  label: "Started At",
                  value: run.startedAt
                    ? format(run.startedAt, "dd/MM/yyyy HH:mm:ss")
                    : "-",
                  description: run.startedAt
                    ? formatDistance(run.startedAt, new Date(), {
                        addSuffix: true,
                      })
                    : undefined,
                  icon: <Clock className="h-4 w-4" />,
                },
                {
                  label: "Completed At",
                  value: run.completedAt
                    ? format(run.completedAt, "dd/MM/yyyy HH:mm:ss")
                    : "-",
                  description: run.completedAt
                    ? formatDistance(run.completedAt, new Date(), {
                        addSuffix: true,
                      })
                    : undefined,
                  icon: <Clock className="h-4 w-4" />,
                },
                {
                  label: "Duration",
                  value:
                    typeof run.durationMs === "number"
                      ? `${run.durationMs} ms`
                      : "-",
                  icon: <Timer className="h-4 w-4" />,
                },
                ...(run.targetChatUserId
                  ? [
                      {
                        label: "Target User",
                        value: run.targetChatUserName || run.targetChatUserId,
                        icon: <User className="h-4 w-4" />,
                      },
                    ]
                  : []),
                ...(run.targetSessionId
                  ? [
                      {
                        label: "Target Session",
                        value: run.targetSessionId,
                        icon: <Hash className="h-4 w-4" />,
                      },
                    ]
                  : []),
                ...(run.errorMessage
                  ? [
                      {
                        label: "Error Message",
                        value: run.errorMessage,
                        icon: <AlertCircle className="h-4 w-4" />,
                        variant: "danger" as const,
                      },
                    ]
                  : []),
              ].filter(Boolean) as DataItem[]
            }
          />

          <H2 className="mt-6">Input</H2>
          <Card>
            <CardContent>
              <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">
                {run.input ? JSON.stringify(run.input, null, 2) : "No input"}
              </pre>
            </CardContent>
          </Card>

          <H2 className="mt-6">Output</H2>
          <Card>
            <CardContent>
              <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">
                {run.output ? JSON.stringify(run.output, null, 2) : "No output"}
              </pre>
            </CardContent>
          </Card>

          {(run.errorCause || run.errorStack) && (
            <>
              <H2 className="mt-6">Error Details</H2>
              <Card>
                <CardContent>
                  <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">
                    {JSON.stringify(
                      {
                        errorCause: run.errorCause,
                        errorStack: run.errorStack,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <H2>Run Logs</H2>
          <div className="space-y-3">
            {run.logs.length === 0 ? (
              <Card>
                <CardContent>No logs recorded for this run.</CardContent>
              </Card>
            ) : (
              run.logs.map((log: any) => (
                <Card key={log.id}>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className={
                          log.error ? "font-medium text-red-600" : "font-medium"
                        }
                      >
                        {log.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(log.createdAt, "dd/MM/yyyy HH:mm:ss")}
                      </p>
                    </div>
                    {log.data && (
                      <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </RecordTabs>
    </Container>
  );
}
