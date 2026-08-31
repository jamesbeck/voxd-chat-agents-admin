import Link from "next/link";
import { format, formatDistance } from "date-fns";
import { notFound } from "next/navigation";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Hash,
  Link as LinkIcon,
  Radio,
  ShieldCheck,
  Timer,
  Webhook,
} from "lucide-react";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import DataCard, { DataItem } from "@/components/adminui/DataCard";
import H1 from "@/components/adminui/H1";
import H2 from "@/components/adminui/H2";
import RecordTabs from "@/components/admin/RecordTabs";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import saGetWebhookReceiptById from "@/actions/saGetWebhookReceiptById";
import { verifyAccessToken } from "@/lib/auth/verifyToken";

const formatLabel = (value?: string | null) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "-";

const formatDateTime = (value?: Date | null) => {
  if (!value) {
    return "-";
  }

  return format(value, "dd/MM/yyyy HH:mm:ss");
};

const formatRelativeTime = (value?: Date | null) => {
  if (!value) {
    return undefined;
  }

  return formatDistance(value, new Date(), { addSuffix: true });
};

const formatJsonLikeValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return JSON.stringify(value, null, 2);
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return value;
  }

  if (
    (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) ||
    (trimmedValue.startsWith("[") && trimmedValue.endsWith("]"))
  ) {
    try {
      return JSON.stringify(JSON.parse(trimmedValue), null, 2);
    } catch {
      return value;
    }
  }

  return value;
};

const renderJson = (value: unknown, emptyLabel: string) => (
  <pre className="overflow-auto rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
    {value === null || value === undefined
      ? emptyLabel
      : formatJsonLikeValue(value)}
  </pre>
);

export default async function WebhookReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ webhookReceiptId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const accessToken = await verifyAccessToken();
  const activeTab = (await searchParams).tab || "details";
  const webhookReceiptId = (await params).webhookReceiptId;

  if (!accessToken.superAdmin) {
    return notFound();
  }

  const result = await saGetWebhookReceiptById({ webhookReceiptId });

  if (!result.success) {
    return notFound();
  }

  const receipt = result.data;

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Webhooks", href: "/webhooks" },
          { label: receipt.webhookKey },
        ]}
      />

      <H1 className="mb-4">{receipt.webhookKey}</H1>

      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "details",
            label: "Details",
            href: `/webhooks/${webhookReceiptId}?tab=details`,
          },
          {
            value: "request",
            label: "Request",
            href: `/webhooks/${webhookReceiptId}?tab=request`,
          },
          {
            value: "response",
            label: "Response",
            href: `/webhooks/${webhookReceiptId}?tab=response`,
          },
        ]}
      >
        <TabsContent value="details">
          <H2>Receipt Details</H2>
          <DataCard
            items={
              [
                {
                  label: "Receipt ID",
                  value: receipt.id,
                  icon: <Hash className="h-4 w-4" />,
                },
                {
                  label: "Agent",
                  value: receipt.agentId ? (
                    <Link
                      href={`/agents/${receipt.agentId}`}
                      className="text-blue-500 hover:underline"
                    >
                      {receipt.agentName}
                    </Link>
                  ) : (
                    receipt.agentName
                  ),
                  icon: <LinkIcon className="h-4 w-4" />,
                },
                {
                  label: "Webhook Key",
                  value: receipt.webhookKey,
                  icon: <Webhook className="h-4 w-4" />,
                },
                {
                  label: "Provider",
                  value: receipt.provider,
                  icon: <Radio className="h-4 w-4" />,
                },
                {
                  label: "Method",
                  value: receipt.method,
                  icon: <Activity className="h-4 w-4" />,
                },
                {
                  label: "Path",
                  value: receipt.path,
                  icon: <LinkIcon className="h-4 w-4" />,
                },
                {
                  label: "Provider Event ID",
                  value: receipt.providerEventId || "-",
                  icon: <Hash className="h-4 w-4" />,
                },
                {
                  label: "Provider Event Type",
                  value: receipt.providerEventType || "-",
                  icon: <Activity className="h-4 w-4" />,
                },
                {
                  label: "Verification Status",
                  value: formatLabel(receipt.verificationStatus),
                  icon: <ShieldCheck className="h-4 w-4" />,
                  variant:
                    receipt.verificationStatus === "verified"
                      ? "success"
                      : receipt.verificationStatus === "invalid"
                        ? "danger"
                        : "info",
                },
                {
                  label: "Run Status",
                  value: formatLabel(receipt.runStatus),
                  icon: <Activity className="h-4 w-4" />,
                  variant:
                    receipt.runStatus === "completed"
                      ? "success"
                      : receipt.runStatus === "failed"
                        ? "danger"
                        : "info",
                },
                {
                  label: "Success",
                  value:
                    receipt.success === null
                      ? "-"
                      : receipt.success
                        ? "Yes"
                        : "No",
                  icon: <CheckCircle className="h-4 w-4" />,
                  variant:
                    receipt.success === null
                      ? "default"
                      : receipt.success
                        ? "success"
                        : "danger",
                },
                {
                  label: "Response Status Code",
                  value: receipt.responseStatusCode || "-",
                  icon: <Activity className="h-4 w-4" />,
                },
                {
                  label: "Created At",
                  value: formatDateTime(receipt.createdAt),
                  description: formatRelativeTime(receipt.createdAt),
                  icon: <Calendar className="h-4 w-4" />,
                },
                {
                  label: "Started At",
                  value: formatDateTime(receipt.startedAt),
                  description: formatRelativeTime(receipt.startedAt),
                  icon: <Clock className="h-4 w-4" />,
                },
                {
                  label: "Completed At",
                  value: formatDateTime(receipt.completedAt),
                  description: formatRelativeTime(receipt.completedAt),
                  icon: <Clock className="h-4 w-4" />,
                },
                {
                  label: "Duration",
                  value:
                    typeof receipt.durationMs === "number"
                      ? `${receipt.durationMs} ms`
                      : "-",
                  icon: <Timer className="h-4 w-4" />,
                },
                ...(receipt.errorMessage
                  ? [
                      {
                        label: "Error Message",
                        value: receipt.errorMessage,
                        icon: <AlertCircle className="h-4 w-4" />,
                        variant: "danger" as const,
                      },
                    ]
                  : []),
              ] satisfies DataItem[]
            }
          />

          {receipt.verificationError && (
            <>
              <H2 className="mt-6">Verification Error</H2>
              <Card>
                <CardContent>
                  <pre className="overflow-auto rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
                    {receipt.verificationError}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="request">
          <H2>Headers</H2>
          <Card>
            <CardContent>
              {renderJson(receipt.headers, "No headers recorded")}
            </CardContent>
          </Card>

          <H2 className="mt-6">Query</H2>
          <Card>
            <CardContent>
              {renderJson(receipt.query, "No query parameters recorded")}
            </CardContent>
          </Card>

          <H2 className="mt-6">Raw Body Received</H2>
          <Card>
            <CardContent>
              {renderJson(receipt.rawBody, "No raw body recorded")}
            </CardContent>
          </Card>

          <H2 className="mt-6">Payload</H2>
          <Card>
            <CardContent>
              {renderJson(receipt.payload, "No payload recorded")}
            </CardContent>
          </Card>

          <H2 className="mt-6">Verification Metadata</H2>
          <Card>
            <CardContent>
              {renderJson(
                receipt.verificationMetadata,
                "No verification metadata recorded",
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="response">
          <H2>Webhook Function Output</H2>
          <Card>
            <CardContent>
              {renderJson(receipt.output, "No output recorded")}
            </CardContent>
          </Card>

          <H2 className="mt-6">Webhook Function Response Body</H2>
          <Card>
            <CardContent>
              {renderJson(receipt.responseBody, "No response body recorded")}
            </CardContent>
          </Card>

          <H2 className="mt-6">Logs</H2>
          <Card>
            <CardContent>
              {renderJson(receipt.logs, "No logs recorded")}
            </CardContent>
          </Card>

          <H2 className="mt-6">Error Details</H2>
          <Card>
            <CardContent>
              {renderJson(
                {
                  errorCause: receipt.errorCause,
                  errorStack: receipt.errorStack,
                },
                "No error details recorded",
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </RecordTabs>
    </Container>
  );
}
