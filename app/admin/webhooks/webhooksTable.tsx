"use client";

import { format, formatDistance } from "date-fns";
import DataTable from "@/components/adminui/Table";
import TableActions from "@/components/admin/TableActions";
import { Badge } from "@/components/ui/badge";
import saGetWebhookReceiptTableData from "@/actions/saGetWebhookReceiptTableData";

const getStatusBadgeClassName = (value?: string | null) => {
  switch (value) {
    case "completed":
    case "verified":
    case "success":
      return "bg-green-600";
    case "failed":
    case "error":
    case "invalid":
      return "bg-red-600";
    case "running":
    case "processing":
      return "bg-blue-600";
    case "received":
    case "pending":
      return "bg-amber-600";
    default:
      return "bg-muted text-foreground";
  }
};

const formatDateTime = (value?: Date | string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return `${format(date, "dd/MM/yyyy HH:mm:ss")} (${formatDistance(
    date,
    new Date(),
    { addSuffix: true },
  )})`;
};

export default function WebhooksTable({ agentId }: { agentId?: string }) {
  const columns = [
    {
      label: "Received",
      name: "createdAt",
      sort: true,
      format: (row: any) => formatDateTime(row.createdAt),
    },
    {
      label: "Agent",
      name: "agentName",
      sort: true,
    },
    {
      label: "Webhook Key",
      name: "webhookKey",
      sort: true,
    },
    {
      label: "Provider",
      name: "provider",
      sort: true,
    },
    {
      label: "Event Type",
      name: "providerEventType",
      sort: true,
      format: (row: any) => row.providerEventType || "-",
    },
    {
      label: "Method",
      name: "method",
      sort: true,
    },
    {
      label: "Path",
      name: "path",
      sort: true,
      format: (row: any) => row.path || "-",
    },
    {
      label: "Run Status",
      name: "runStatus",
      sort: true,
      format: (row: any) => (
        <Badge className={getStatusBadgeClassName(row.runStatus)}>
          {row.runStatus || "-"}
        </Badge>
      ),
    },
    {
      label: "Verification",
      name: "verificationStatus",
      sort: true,
      format: (row: any) => (
        <Badge className={getStatusBadgeClassName(row.verificationStatus)}>
          {row.verificationStatus || "-"}
        </Badge>
      ),
    },
    {
      label: "Success",
      name: "success",
      sort: true,
      format: (row: any) => (
        <Badge className={row.success === true ? "bg-green-600" : "bg-red-600"}>
          {row.success === null || row.success === undefined
            ? "-"
            : row.success
              ? "Yes"
              : "No"}
        </Badge>
      ),
    },
    {
      label: "HTTP",
      name: "responseStatusCode",
      sort: true,
      format: (row: any) => row.responseStatusCode || "-",
    },
    {
      label: "Duration",
      name: "durationMs",
      sort: true,
      format: (row: any) =>
        typeof row.durationMs === "number" ? `${row.durationMs} ms` : "-",
    },
    {
      label: "Error",
      name: "errorMessage",
      format: (row: any) =>
        row.errorMessage
          ? row.errorMessage.length > 80
            ? `${row.errorMessage.slice(0, 80)}...`
            : row.errorMessage
          : "-",
    },
  ];

  return (
    <DataTable
      tableId={agentId ? `agent-webhooks-${agentId}` : "admin-webhooks"}
      defaultSort={{ name: "createdAt", direction: "desc" }}
      getData={saGetWebhookReceiptTableData}
      getDataParams={{ agentId }}
      columns={columns}
      actions={(row: any) => (
        <TableActions href={`/webhooks/${row.id}`} label="View" />
      )}
    />
  );
}
