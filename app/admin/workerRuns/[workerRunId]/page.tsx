import { format, formatDistance } from "date-fns";
import getWorkerRunById from "@/lib/getWorkerRunById";
import getSessionById from "@/lib/getSessionById";
import getAgentById from "@/lib/getAgentById";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import H2 from "@/components/adminui/H2";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { Card, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";
import { TabsContent } from "@/components/ui/tabs";
import RecordTabs from "@/components/admin/RecordTabs";
import Link from "next/link";
import DataCard, { DataItem } from "@/components/adminui/DataCard";
import {
  Cog,
  Activity,
  CheckCircle,
  Calendar,
  Clock,
  Play,
  CircleCheck,
  Link as LinkIcon,
  AlertCircle,
} from "lucide-react";

export default async function Page({
  searchParams,
  params,
}: {
  params: { workerRunId: string };
  searchParams: { tab?: string };
}) {
  const activeTab = (await searchParams).tab || "details";

  await verifyAccessToken();

  const awaitedParams = await params;
  const workerRunId = awaitedParams.workerRunId;

  const workerRun = await getWorkerRunById({ workerRunId });

  if (!workerRun) notFound();

  const session = await getSessionById({ sessionId: workerRun.sessionId });
  if (!session) notFound();

  const agent = await getAgentById({ agentId: session.agentId });

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Agents", href: "/agents" },
          { label: agent.niceName, href: `/agents/${agent.id}` },
          {
            label: session.id,
            href: `/sessions/${session.id}?tab=workers`,
          },
          { label: workerRun.workerName },
        ]}
      />

      <H1 className="text-2xl font-semibold mb-4">
        Worker: {workerRun.workerName}
      </H1>

      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "details",
            label: "Details",
            href: `/workerRuns/${workerRunId}?tab=details`,
          },
        ]}
      >
        <TabsContent value="details">
          <Container>
            <H2>Worker Run Details</H2>
            <DataCard
              items={
                [
                  {
                    label: "Worker Name",
                    value: workerRun.workerName,
                    icon: <Cog className="h-4 w-4" />,
                  },
                  {
                    label: "Status",
                    value: (
                      <span className="capitalize">{workerRun.runStatus}</span>
                    ),
                    icon: <Activity className="h-4 w-4" />,
                    variant:
                      workerRun.runStatus === "completed"
                        ? "success"
                        : workerRun.runStatus === "failed"
                          ? "danger"
                          : workerRun.runStatus === "running"
                            ? "info"
                            : "warning",
                  },
                  {
                    label: "Result",
                    value: workerRun.runResult ? (
                      <span className="capitalize">{workerRun.runResult}</span>
                    ) : (
                      "-"
                    ),
                    icon: <CheckCircle className="h-4 w-4" />,
                    variant:
                      workerRun.runResult === "success"
                        ? "success"
                        : workerRun.runResult === "error"
                          ? "danger"
                          : "default",
                  },
                  {
                    label: "Created At",
                    value: format(workerRun.createdAt, "dd/MM/yyyy HH:mm:ss"),
                    description: formatDistance(
                      workerRun.createdAt,
                      new Date(),
                      {
                        addSuffix: true,
                      },
                    ),
                    icon: <Calendar className="h-4 w-4" />,
                  },
                  {
                    label: "Scheduled For",
                    value: format(
                      workerRun.scheduledFor,
                      "dd/MM/yyyy HH:mm:ss",
                    ),
                    description: formatDistance(
                      workerRun.scheduledFor,
                      new Date(),
                      {
                        addSuffix: true,
                      },
                    ),
                    icon: <Clock className="h-4 w-4" />,
                  },
                  {
                    label: "Started At",
                    value: workerRun.startedAt
                      ? format(workerRun.startedAt, "dd/MM/yyyy HH:mm:ss")
                      : "-",
                    description: workerRun.startedAt
                      ? formatDistance(workerRun.startedAt, new Date(), {
                          addSuffix: true,
                        })
                      : undefined,
                    icon: <Play className="h-4 w-4" />,
                  },
                  {
                    label: "Completed At",
                    value: workerRun.completedAt
                      ? format(workerRun.completedAt, "dd/MM/yyyy HH:mm:ss")
                      : "-",
                    description: workerRun.completedAt
                      ? formatDistance(workerRun.completedAt, new Date(), {
                          addSuffix: true,
                        })
                      : undefined,
                    icon: <CircleCheck className="h-4 w-4" />,
                  },
                  {
                    label: "Session",
                    value: (
                      <Link
                        href={`/sessions/${session.id}`}
                        className="text-blue-500 hover:underline"
                      >
                        {session.id}
                      </Link>
                    ),
                    icon: <LinkIcon className="h-4 w-4" />,
                  },
                  ...(workerRun.error
                    ? [
                        {
                          label: "Error",
                          value: workerRun.error,
                          icon: <AlertCircle className="h-4 w-4" />,
                          variant: "danger" as const,
                        },
                      ]
                    : []),
                ] satisfies DataItem[]
              }
            />

            <H2 className="mt-6">Worker Data</H2>
            <Card>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                  {workerRun.workerData
                    ? JSON.stringify(workerRun.workerData, null, 2)
                    : "No worker data"}
                </pre>
              </CardContent>
            </Card>

            <H2 className="mt-6">Session Data</H2>
            <Card>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                  {workerRun.sessionData
                    ? JSON.stringify(workerRun.sessionData, null, 2)
                    : "No session data"}
                </pre>
              </CardContent>
            </Card>

            <H2 className="mt-6">User Data</H2>
            <Card>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                  {workerRun.userData
                    ? JSON.stringify(workerRun.userData, null, 2)
                    : "No user data"}
                </pre>
              </CardContent>
            </Card>
          </Container>
        </TabsContent>
      </RecordTabs>
    </Container>
  );
}
