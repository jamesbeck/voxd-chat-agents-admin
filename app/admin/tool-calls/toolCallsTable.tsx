"use client";

import DataTable from "@/components/adminui/Table";
import { format, formatDistance } from "date-fns";
import saGetToolCallTableData from "@/actions/saGetToolCallTableData";
import { Badge } from "@/components/ui/badge";
import TableActions from "@/components/admin/TableActions";

const ToolCallsTable = () => {
  const columns = [
    {
      label: "Date/Time",
      name: "startedAt",
      sort: true,
      format: (row: any) =>
        row.startedAt
          ? `${format(row.startedAt, "dd/MM/yyyy HH:mm:ss")} (${formatDistance(
              row.startedAt,
              new Date(),
              { addSuffix: true },
            )})`
          : "",
    },
    {
      label: "Tool Name",
      name: "toolName",
      sort: true,
    },
    {
      label: "Agent",
      name: "agentName",
      sort: true,
    },
    {
      label: "Chat User Name",
      name: "chatUserName",
      sort: true,
      format: (row: any) => row.chatUserName || "-",
    },
    {
      label: "Chat User Number",
      name: "chatUserNumber",
      sort: true,
    },
    {
      label: "Errors",
      name: "hasError",
      sort: true,
      format: (row: any) => (
        <Badge className={row.hasError ? "bg-red-500" : "bg-green-500"}>
          {row.hasError ? "Yes" : "No"}
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      defaultSort={{ name: "startedAt", direction: "desc" }}
      getData={saGetToolCallTableData}
      getDataParams={{}}
      columns={columns}
      actions={(row: any) => (
        <TableActions
          href={`/messages/${row.assistantMessageId}?type=assistant&tab=tool-calls`}
          label="View Message"
        />
      )}
    />
  );
};

export default ToolCallsTable;
