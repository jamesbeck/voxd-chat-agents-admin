"use client";

import DataTable, { Column } from "@/components/adminui/Table";
import { format, formatDistance } from "date-fns";
import saGetSessionTableData from "@/actions/saGetSessionsTableData";
import { Badge } from "@/components/ui/badge";
import TableActions from "@/components/admin/TableActions";

const SessionsTable = ({ userId }: { userId: string }) => {
  const columns: Column[] = [
    {
      label: "Agent",
      name: "agentName",
      sort: true,
      linkTo: (row: any) => `/agents/${row.agentId}`,
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
  ];

  return (
    <DataTable
      defaultSort={{
        name: "lastMessageAt",
        direction: "desc",
      }}
      getData={saGetSessionTableData}
      getDataParams={{ userId }}
      columns={columns}
      actions={(row: any) => (
        <TableActions href={`/sessions/${row.id}`} label="View Chat" />
      )}
    />
  );
};

export default SessionsTable;
