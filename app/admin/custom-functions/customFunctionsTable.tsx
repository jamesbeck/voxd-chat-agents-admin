"use client";

import { format, formatDistance } from "date-fns";
import saGetCustomFunctionTableData from "@/actions/saGetCustomFunctionTableData";
import TableActions from "@/components/admin/TableActions";
import DataTable from "@/components/adminui/Table";
import { Badge } from "@/components/ui/badge";

const formatDurationMs = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }

  return `${Math.round(value)} ms`;
};

const formatSuccessRate = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toFixed(1)}%`;
};

const CustomFunctionsTable = () => {
  return (
    <DataTable
      tableId="custom-functions"
      getData={saGetCustomFunctionTableData}
      defaultSort={{ name: "label", direction: "asc" }}
      columns={[
        {
          label: "Function",
          name: "label",
          sort: true,
          format: (row: any) => (
            <div className="space-y-1">
              <p className="font-medium">
                {row.niceName || row.name || row.key}
              </p>
              <p className="text-xs text-muted-foreground">{row.key}</p>
            </div>
          ),
        },
        {
          label: "Agent",
          name: "agentName",
          sort: true,
        },
        {
          label: "Scopes",
          name: "targetScopes",
          sort: true,
          format: (row: any) => row.targetScopes.join(", "),
        },
        {
          label: "Manual",
          name: "allowManualRun",
          sort: true,
          format: (row: any) => (
            <Badge
              className={row.allowManualRun ? "bg-green-600" : "bg-slate-500"}
            >
              {row.allowManualRun ? "Yes" : "No"}
            </Badge>
          ),
        },
        {
          label: "API",
          name: "allowApiRun",
          sort: true,
          format: (row: any) => (
            <Badge
              className={row.allowApiRun ? "bg-green-600" : "bg-slate-500"}
            >
              {row.allowApiRun ? "Yes" : "No"}
            </Badge>
          ),
        },
        {
          label: "Enabled",
          name: "enabled",
          sort: true,
          format: (row: any) => (
            <Badge className={row.enabled ? "bg-green-600" : "bg-red-600"}>
              {row.enabled ? "Enabled" : "Disabled"}
            </Badge>
          ),
        },
        {
          label: "Schedule Cron",
          name: "scheduleCron",
          sort: true,
          format: (row: any) => row.scheduleCron || "-",
        },
        {
          label: "Total Runs",
          name: "totalRuns",
          sort: true,
          tooltip: "All-time count of run records for this custom function.",
          format: (row: any) => row.totalRuns ?? 0,
        },
        {
          label: "Avg Run Time",
          name: "avgRunDurationMs",
          sort: true,
          tooltip:
            "Average duration across the most recent 100 runs for this custom function.",
          format: (row: any) => formatDurationMs(row.avgRunDurationMs),
        },
        {
          label: "Success Rate",
          name: "successRate",
          sort: true,
          tooltip:
            "Percentage of successful runs across the most recent 100 runs for this custom function.",
          format: (row: any) => {
            const successRate = row.successRate;

            if (typeof successRate !== "number" || Number.isNaN(successRate)) {
              return "-";
            }

            return (
              <span
                className={
                  successRate < 100 ? "text-red-600 font-medium" : undefined
                }
              >
                {formatSuccessRate(successRate)}
              </span>
            );
          },
        },
        {
          label: "Next Scheduled Run",
          name: "nextScheduledRunAt",
          sort: true,
          format: (row: any) =>
            row.nextScheduledRunAt
              ? `${format(row.nextScheduledRunAt, "dd/MM/yyyy HH:mm:ss")} (${formatDistance(
                  row.nextScheduledRunAt,
                  new Date(),
                  { addSuffix: true },
                )})`
              : "-",
        },
        {
          label: "Updated",
          name: "updatedAt",
          sort: true,
          format: (row: any) =>
            `${format(row.updatedAt, "dd/MM/yyyy HH:mm:ss")} (${formatDistance(
              row.updatedAt,
              new Date(),
              { addSuffix: true },
            )})`,
        },
      ]}
      actions={(row: any) => (
        <TableActions href={`/custom-functions/${row.id}`} />
      )}
    />
  );
};

export default CustomFunctionsTable;
