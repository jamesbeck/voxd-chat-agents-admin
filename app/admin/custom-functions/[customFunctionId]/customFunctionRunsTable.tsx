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

export default function CustomFunctionRunsTable({
  customFunctionId,
}: {
  customFunctionId: string;
}) {
  return (
    <DataTable
      tableId={`custom-function-runs-${customFunctionId}`}
      getData={saGetCustomFunctionRunTableData}
      getDataParams={{ customFunctionId }}
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
}
