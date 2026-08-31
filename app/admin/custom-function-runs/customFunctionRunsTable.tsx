"use client";

import { format, formatDistance } from "date-fns";
import saGetCustomFunctionRunTableData from "@/actions/saGetCustomFunctionRunTableData";
import TableActions from "@/components/admin/TableActions";
import DataTable from "@/components/adminui/Table";
import { Badge } from "@/components/ui/badge";

const formatRunLabel = (value?: string | null) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "-";

const getRunStatusBadgeClassName = (runStatus: string, hasError: boolean) => {
  if (hasError || runStatus === "failed") {
    return "bg-red-600";
  }

  if (runStatus === "running") {
    return "bg-blue-600";
  }

  if (runStatus === "completed") {
    return "bg-green-600";
  }

  return "bg-slate-500";
};

const CustomFunctionRunsTable = () => {
  return (
    <DataTable
      tableId="custom-function-runs"
      getData={saGetCustomFunctionRunTableData}
      defaultSort={{ name: "createdAt", direction: "desc" }}
      columns={[
        {
          label: "Created",
          name: "createdAt",
          sort: true,
          format: (row: any) =>
            `${format(row.createdAt, "dd/MM/yyyy HH:mm:ss")} (${formatDistance(
              row.createdAt,
              new Date(),
              { addSuffix: true },
            )})`,
        },
        {
          label: "Function",
          name: "customFunctionName",
          sort: true,
          format: (row: any) => (
            <div className="space-y-1">
              <p className="font-medium">{row.customFunctionName}</p>
              <p className="text-xs text-muted-foreground">
                {row.customFunctionKey}
              </p>
            </div>
          ),
        },
        {
          label: "Agent",
          name: "agentName",
          sort: true,
        },
        {
          label: "Scope",
          name: "targetScope",
          sort: true,
        },
        {
          label: "Target",
          name: "targetChatUserName",
          format: (row: any) =>
            row.targetChatUserName ||
            row.targetSessionId ||
            row.targetChatUserId ||
            "-",
        },
        {
          label: "Trigger",
          name: "triggerSource",
          sort: true,
        },
        {
          label: "Status",
          name: "runStatus",
          sort: true,
          format: (row: any) => (
            <Badge
              className={getRunStatusBadgeClassName(
                row.runStatus,
                row.hasError,
              )}
            >
              {formatRunLabel(row.runStatus)}
            </Badge>
          ),
        },
        {
          label: "Result",
          name: "runResult",
          format: (row: any) => formatRunLabel(row.runResult),
        },
        {
          label: "Duration",
          name: "durationMs",
          sort: true,
          format: (row: any) =>
            typeof row.durationMs === "number" ? `${row.durationMs} ms` : "-",
        },
      ]}
      actions={(row: any) => (
        <TableActions href={`/custom-function-runs/${row.id}`} />
      )}
    />
  );
};

export default CustomFunctionRunsTable;
