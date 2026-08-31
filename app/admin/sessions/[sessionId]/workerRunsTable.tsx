"use client";

import DataTable from "@/components/adminui/Table";
import { format, formatDistance } from "date-fns";
import saGetWorkerRunTableData from "@/actions/saGetWorkerRunTableData";
import saRequeueWorkerRun from "@/actions/saRequeueWorkerRun";
import saRunWorkerNow from "@/actions/saRunWorkerNow";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import TableActions from "@/components/admin/TableActions";

const WorkerRunsTable = ({ sessionId }: { sessionId: string }) => {
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const [runningNowId, setRunningNowId] = useState<string | null>(null);

  const handleRerun = async (workerRunId: string) => {
    setRerunningId(workerRunId);
    try {
      const result = await saRequeueWorkerRun({ workerRunId });
      if (!result.success) {
        console.error("Failed to requeue worker:", result.error);
      }
    } catch (error) {
      console.error("Error requeuing worker:", error);
    } finally {
      setRerunningId(null);
    }
  };

  const handleRunNow = async (workerRunId: string) => {
    setRunningNowId(workerRunId);
    try {
      const result = await saRunWorkerNow({ workerRunId });
      if (!result.success) {
        console.error("Failed to run worker now:", result.error);
      }
    } catch (error) {
      console.error("Error running worker now:", error);
    } finally {
      setRunningNowId(null);
    }
  };

  const columns = [
    {
      label: "Worker",
      name: "workerName",
      sort: true,
    },
    {
      label: "Status",
      name: "runStatus",
      sort: true,
      format: (row: any) => {
        const status = row.runStatus || "unknown";
        const statusColors: Record<string, string> = {
          queued: "bg-orange-500",
          pending: "bg-yellow-500",
          running: "bg-blue-500",
          completed: "bg-green-500",
          failed: "bg-red-500",
        };
        return (
          <Badge
            className={cn(statusColors[status] || "bg-gray-500", "capitalize")}
          >
            {status}
          </Badge>
        );
      },
    },
    {
      label: "Result",
      name: "runResult",
      sort: true,
      format: (row: any) => {
        if (!row.runResult) return "-";
        const resultColors: Record<string, string> = {
          success: "bg-green-500",
          error: "bg-red-500",
        };
        return (
          <Badge
            className={cn(
              resultColors[row.runResult] || "bg-gray-500",
              "capitalize",
            )}
          >
            {row.runResult}
          </Badge>
        );
      },
    },
    {
      label: "Scheduled For",
      name: "scheduledFor",
      sort: true,
      format: (row: any) =>
        row.scheduledFor
          ? `${format(
              row.scheduledFor,
              "dd/MM/yyyy HH:mm:ss",
            )} (${formatDistance(row.scheduledFor, new Date(), {
              addSuffix: true,
            })})`
          : "-",
    },
    {
      label: "Started At",
      name: "startedAt",
      sort: true,
      format: (row: any) =>
        row.startedAt ? format(row.startedAt, "dd/MM/yyyy HH:mm:ss") : "-",
    },
    {
      label: "Completed At",
      name: "completedAt",
      sort: true,
      format: (row: any) =>
        row.completedAt ? format(row.completedAt, "dd/MM/yyyy HH:mm:ss") : "-",
    },
    {
      label: "Error",
      name: "error",
      sort: false,
      format: (row: any) =>
        row.error ? (
          <span className="text-red-500 text-sm">{row.error}</span>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <DataTable
      defaultSort={{
        name: "scheduledFor",
        direction: "desc",
      }}
      getData={saGetWorkerRunTableData}
      getDataParams={{ sessionId }}
      columns={columns}
      actions={(row: any) => (
        <TableActions
          buttons={[
            { label: "View", href: `/workerRuns/${row.id}` },
            {
              label: runningNowId === row.id ? "Running..." : "Run Now",
              hidden: row.runStatus !== "queued",
              onClick: () => handleRunNow(row.id),
              disabled: runningNowId === row.id,
            },
            {
              label: rerunningId === row.id ? "Re-running..." : "Re-run",
              variant: "outline",
              onClick: () => handleRerun(row.id),
              disabled: rerunningId === row.id,
            },
          ]}
        />
      )}
    />
  );
};

export default WorkerRunsTable;
