import Link from "next/link";
import { format, formatDistance } from "date-fns";
import { notFound } from "next/navigation";
import {
  Calendar,
  Clock,
  Hash,
  Link as LinkIcon,
  WandSparkles,
} from "lucide-react";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import RecordTabs from "@/components/admin/RecordTabs";
import Container from "@/components/adminui/Container";
import DataCard, { DataItem } from "@/components/adminui/DataCard";
import H1 from "@/components/adminui/H1";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import getCustomFunctionById from "@/lib/getCustomFunctionById";
import CustomFunctionActions from "./customFunctionActions";
import CustomFunctionRunsTable from "./customFunctionRunsTable";
import EditScheduleForm from "./editScheduleForm";

export default async function CustomFunctionPage({
  params,
  searchParams,
}: {
  params: Promise<{ customFunctionId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    return notFound();
  }

  const customFunctionId = (await params).customFunctionId;
  const activeTab = (await searchParams).tab || "schedule";
  const customFunction = await getCustomFunctionById({ customFunctionId });

  if (!customFunction) {
    return notFound();
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Custom Functions", href: "/custom-functions" },
          { label: customFunction.niceName },
        ]}
      />

      <H1 className="mb-2 flex items-center gap-3">
        <span>{customFunction.niceName}</span>
        <Badge
          className={customFunction.enabled ? "bg-green-600" : "bg-red-600"}
        >
          {customFunction.enabled ? "Enabled" : "Disabled"}
        </Badge>
      </H1>

      <p className="mb-6 text-sm text-muted-foreground">{customFunction.key}</p>

      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "schedule",
            label: "Schedule",
            href: `/custom-functions/${customFunctionId}?tab=schedule`,
          },
          {
            value: "runs",
            label: "Runs Logs",
            href: `/custom-functions/${customFunctionId}?tab=runs`,
          },
        ]}
        actions={
          <CustomFunctionActions
            customFunctionId={customFunction.id}
            agentId={customFunction.agentId}
            customFunctionName={customFunction.niceName}
          />
        }
      >
        <TabsContent value="schedule">
          <div className="space-y-6">
            <DataCard
              items={
                [
                  {
                    label: "Key",
                    value: customFunction.key,
                    icon: <Hash className="h-4 w-4" />,
                  },
                  {
                    label: "Agent",
                    value: (
                      <Link
                        href={`/agents/${customFunction.agentId}`}
                        className="text-primary hover:underline"
                      >
                        {customFunction.agentName}
                      </Link>
                    ),
                    icon: <LinkIcon className="h-4 w-4" />,
                  },
                  {
                    label: "Internal Name",
                    value: customFunction.name,
                    icon: <WandSparkles className="h-4 w-4" />,
                  },
                  {
                    label: "Target Scopes",
                    value: customFunction.targetScopes.join(", "),
                    icon: <WandSparkles className="h-4 w-4" />,
                  },
                  {
                    label: "Next Scheduled Run",
                    value: customFunction.nextScheduledRunAt
                      ? format(
                          customFunction.nextScheduledRunAt,
                          "dd/MM/yyyy HH:mm:ss",
                        )
                      : "-",
                    description: customFunction.nextScheduledRunAt
                      ? formatDistance(
                          customFunction.nextScheduledRunAt,
                          new Date(),
                          {
                            addSuffix: true,
                          },
                        )
                      : undefined,
                    icon: <Calendar className="h-4 w-4" />,
                  },
                  {
                    label: "Updated",
                    value: format(
                      customFunction.updatedAt,
                      "dd/MM/yyyy HH:mm:ss",
                    ),
                    description: formatDistance(
                      customFunction.updatedAt,
                      new Date(),
                      {
                        addSuffix: true,
                      },
                    ),
                    icon: <Clock className="h-4 w-4" />,
                  },
                ] as DataItem[]
              }
            />

            <Card>
              <CardHeader>
                <CardTitle>Schedule Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <EditScheduleForm
                  customFunctionId={customFunction.id}
                  scheduleCron={customFunction.scheduleCron}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="runs">
          <CustomFunctionRunsTable customFunctionId={customFunction.id} />
        </TabsContent>
      </RecordTabs>
    </Container>
  );
}
