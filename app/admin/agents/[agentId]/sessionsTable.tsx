"use client";

import DataTable from "@/components/adminui/Table";
import TableLink from "@/components/adminui/TableLink";
import { format, formatDistance } from "date-fns";
import saGetSessionTableData from "@/actions/saGetSessionsTableData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import TableActions from "@/components/admin/TableActions";
import { getSessionStatus } from "@/lib/sessionStatus";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";

const SessionsTable = ({
  agentId,
  superAdmin,
}: {
  agentId: string;
  superAdmin: boolean;
}) => {
  const [exporting, setExporting] = useState(false);
  const getDataParams = useMemo(() => ({ agentId }), [agentId]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const result = await saGetSessionTableData({
        agentId,
        page: 1,
        pageSize: 10000,
        sortField: "lastMessageAt",
        sortDirection: "desc",
      });
      if (!result.success) return;

      const liveSessions = result.data.filter(
        (row: any) => row.sessionType === "live",
      );

      const headers = [
        "Name",
        "Number",
        "Email",
        "Session Opened",
        "Last Seen",
        "User Messages",
        "Assistant Messages",
        "Other Messages",
      ];
      const escapeCsv = (val: any) => {
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const csvRows = liveSessions.map((row: any) =>
        [
          row.name ?? "",
          row.number ?? "",
          row.email ?? "",
          row.sessionOpenedAt
            ? format(row.sessionOpenedAt, "yyyy-MM-dd HH:mm:ss")
            : "",
          row.lastMessageAt
            ? format(row.lastMessageAt, "yyyy-MM-dd HH:mm:ss")
            : "",
          row.userMessageCount ?? 0,
          row.assistantMessageCount ?? 0,
          row.otherMessageCount ?? 0,
        ]
          .map(escapeCsv)
          .join(","),
      );

      const csv = [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sessions-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };
  const columns = [
    {
      label: "Type",
      name: "sessionType",
      sort: true,
      format: (row: any) => (
        <Badge
          className={cn(
            row.sessionType == "live" ? "bg-green-500" : "bg-red-500",
            "capitalize",
          )}
        >
          {row.sessionType}
        </Badge>
      ),
    },
    {
      label: "Status",
      name: "closedAt",
      sort: true,
      format: (row: any) => {
        const status = getSessionStatus(row);
        const badge = (
          <Badge className={status.badgeClassName}>{status.label}</Badge>
        );

        if (status.key === "closed" && row.closedReason) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>{badge}</TooltipTrigger>
              <TooltipContent>{row.closedReason}</TooltipContent>
            </Tooltip>
          );
        }
        return badge;
      },
    },
    {
      label: "Platform",
      name: "platform",
      sort: true,
      format: (row: any) => (
        <Badge
          className={
            row.platform === "whatsapp" ? "bg-green-500" : "bg-gray-500"
          }
        >
          {row.platform === "whatsapp" ? "WA" : "Web"}
        </Badge>
      ),
    },
    {
      label: "Name",
      name: "name",
      sort: true,
      format: (row: any) => (
        <TableLink href={`/chatUsers/${row.userId}`}>
          {row.name}
        </TableLink>
      ),
    },
    {
      label: "Number",
      name: "number",
      sort: true,
    },
    {
      label: "Session Opened",
      name: "sessionOpenedAt",
      sort: true,
      format: (row: any) =>
        row.sessionOpenedAt
          ? `${format(
              row.sessionOpenedAt,
              "dd/MM/yyyy HH:mm",
            )} (${formatDistance(row.sessionOpenedAt, new Date())})`
          : "",
    },
    {
      label: "Last Seen",
      name: "lastMessageAt",
      sort: true,
      format: (row: any) =>
        row.lastMessageAt
          ? `${format(row.lastMessageAt, "dd/MM/yyyy HH:mm")} (${formatDistance(
              row.lastMessageAt,
              new Date(),
            )})`
          : "",
    },
    {
      label: "User",
      name: "userMessageCount",
      sort: true,
    },
    {
      label: "Assistant",
      name: "assistantMessageCount",
      sort: true,
    },
    {
      label: "Other",
      name: "otherMessageCount",
      sort: true,
    },
    {
      label: "Cost",
      name: "totalCost",
      sort: true,
      format: (row: any) => `$${row.totalCost.toFixed(4)}`,
    },
  ];

  return (
    <DataTable
      defaultSort={{
        name: "lastMessageAt",
        direction: "desc",
      }}
      getData={saGetSessionTableData}
      getDataParams={getDataParams}
      columns={columns}
      headerActions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={exporting}
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      }
      actions={(row: any) => (
        <TableActions
          buttons={[
            {
              label: "View",
              href: `/sessions/${row.id}`,
              hidden: row.sessionType === "development" && !superAdmin,
            },
          ]}
        />
      )}
    />
  );
};

export default SessionsTable;
