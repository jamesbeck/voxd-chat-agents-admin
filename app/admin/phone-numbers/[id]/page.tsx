import saGetPhoneNumberById from "@/actions/saGetPhoneNumberById";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import H1 from "@/components/adminui/H1";
import Container from "@/components/adminui/Container";
import { TabsContent } from "@/components/ui/tabs";
import RecordTabs from "@/components/admin/RecordTabs";
import { notFound } from "next/navigation";
import DataCard, { DataItem } from "@/components/adminui/DataCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Phone,
  Hash,
  Shield,
  Activity,
  Signal,
  CheckCircle,
  Server,
  Layers,
  Building2,
  MessageSquare,
} from "lucide-react";
import PhoneNumberActions from "./phoneNumberActions";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const phoneNumberId = (await params).id;
  const activeTab = (await searchParams).tab || "info";

  const result = await saGetPhoneNumberById({ phoneNumberId });

  if (!result.success || !result.data) {
    return notFound();
  }

  const phoneNumber = result.data;

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Phone Numbers", href: "/phone-numbers" },
          { label: phoneNumber.displayPhoneNumber },
        ]}
      />
      <H1>{phoneNumber.displayPhoneNumber}</H1>

      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "info",
            label: "Info",
            href: `/phone-numbers/${phoneNumberId}?tab=info`,
          },
        ]}
        actions={
          <PhoneNumberActions
            phoneNumberId={phoneNumberId}
            metaId={phoneNumber.metaId}
          />
        }
      >
        <TabsContent value="info">
          <Container>
            <DataCard
              items={
                [
                  {
                    label: "Display Phone Number",
                    value: phoneNumber.displayPhoneNumber,
                    icon: <Phone className="h-4 w-4" />,
                  },
                  {
                    label: "Meta ID",
                    value: phoneNumber.metaId,
                    icon: <Hash className="h-4 w-4" />,
                  },
                  {
                    label: "Verified Name",
                    value: phoneNumber.verifiedName || "Not verified",
                    icon: <CheckCircle className="h-4 w-4" />,
                    variant: phoneNumber.verifiedName ? "success" : "warning",
                  },
                  {
                    label: "Status",
                    value: (
                      <Badge
                        className={cn(
                          phoneNumber.status === "CONNECTED"
                            ? "bg-green-500"
                            : "bg-red-500",
                        )}
                      >
                        {phoneNumber.status}
                      </Badge>
                    ),
                    icon: <Activity className="h-4 w-4" />,
                  },
                  {
                    label: "Account Mode",
                    value: (
                      <Badge
                        className={cn(
                          phoneNumber.accountMode === "LIVE"
                            ? "bg-green-500"
                            : "bg-red-500",
                        )}
                      >
                        {phoneNumber.accountMode}
                      </Badge>
                    ),
                    icon: <Shield className="h-4 w-4" />,
                  },
                  {
                    label: "Platform Type",
                    value: (
                      <Badge
                        className={cn(
                          phoneNumber.platformType === "CLOUD_API"
                            ? "bg-green-500"
                            : "bg-red-500",
                        )}
                      >
                        {phoneNumber.platformType}
                      </Badge>
                    ),
                    icon: <Server className="h-4 w-4" />,
                  },
                  {
                    label: "Name Status",
                    value: phoneNumber.nameStatus || "Not set",
                    icon: <CheckCircle className="h-4 w-4" />,
                  },
                  {
                    label: "Messaging Limit Tier",
                    value: phoneNumber.messagingLimitTier || "Not set",
                    icon: <MessageSquare className="h-4 w-4" />,
                  },
                  {
                    label: "WABA",
                    value: phoneNumber.wabaName || "Not set",
                    icon: <Building2 className="h-4 w-4" />,
                  },
                  {
                    label: "App",
                    value: phoneNumber.appName || "Not set",
                    icon: <Layers className="h-4 w-4" />,
                  },
                  {
                    label: "Quality Score",
                    value: phoneNumber.qualityScore
                      ? JSON.stringify(phoneNumber.qualityScore)
                      : "Not set",
                    icon: <Signal className="h-4 w-4" />,
                  },
                  {
                    label: "Webhook Configuration",
                    value: phoneNumber.webhookConfiguration
                      ? JSON.stringify(phoneNumber.webhookConfiguration)
                      : "Not set",
                    icon: <Server className="h-4 w-4" />,
                  },
                ] as DataItem[]
              }
            />

            {phoneNumber.healthStatus?.entities &&
              phoneNumber.healthStatus.entities.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Health Status</h3>
                  <div className="rounded-xl border bg-card shadow-sm overflow-hidden divide-y">
                    {phoneNumber.healthStatus.entities.map((entity) => (
                      <div
                        key={entity.id}
                        className="px-4 py-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            className={cn(
                              entity.can_send_message === "AVAILABLE"
                                ? "bg-green-500"
                                : "bg-red-500",
                            )}
                          >
                            {entity.entity_type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {entity.can_send_message}
                          </span>
                        </div>
                        {entity.errors &&
                          entity.can_send_message !== "AVAILABLE" && (
                            <div className="text-sm text-red-500">
                              {entity.errors.map((error) => (
                                <div key={error.error_code}>
                                  <span className="font-medium">
                                    {error.error_code}:
                                  </span>{" "}
                                  {error.error_description}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </Container>
        </TabsContent>
      </RecordTabs>
    </Container>
  );
}
