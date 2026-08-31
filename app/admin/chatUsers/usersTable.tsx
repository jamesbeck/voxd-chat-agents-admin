"use client";

import { format, formatDistance } from "date-fns";
import saGetUserTableData from "@/actions/saGetChatUserTableData";
import DataTable from "@/components/adminui/Table";
import { Badge } from "@/components/ui/badge";
import TableLink from "@/components/adminui/TableLink";
import TableActions from "@/components/admin/TableActions";

const usersTable = () => {
  const columns = [
    {
      label: "Name",
      name: "name",
      sort: true,
      format: (row: any) => (
        <TableLink href={`/chatUsers/${row.id}`}>{row.name}</TableLink>
      ),
    },
    {
      label: "Number",
      name: "number",
      sort: true,
      // format: (value) => value || "",
    },
    {
      label: "Email",
      name: "email",
      sort: true,
    },
    {
      label: "Platform",
      name: "platforms",
      format: (row: any) => (
        <div className="flex gap-1">
          {row.platforms?.includes("whatsapp") && (
            <Badge className="bg-green-500">WA</Badge>
          )}
          {row.platforms?.some((p: string) => p !== "whatsapp") && (
            <Badge className="bg-gray-500">Web</Badge>
          )}
        </div>
      ),
    },
    {
      label: "Agent",
      name: "agentNiceName",
      format: (row: any) => {
        if (!row.agentId) return null;
        return (
          <TableLink href={`/agents/${row.agentId}`}>
            {row.agentNiceName}
          </TableLink>
        );
      },
    },
    {
      label: "Sessions",
      name: "sessionCount",
      sort: true,
    },
    {
      label: "Messages",
      name: "messageCount",
      sort: true,
    },
    {
      label: "Cost",
      name: "totalCost",
      sort: true,
      format: (row: any) => `$${row.totalCost.toFixed(4)}`,
    },
    {
      label: "Last Message",
      name: "lastMessageAt",
      sort: true,
      format: (row: any) =>
        row.lastMessageAt
          ? `${format(row.lastMessageAt, "dd/MM/yyyy HH:mm")} (${formatDistance(
              row.lastMessageAt,
              new Date(),
            )})`
          : "Never",
    },
  ];

  return (
    <DataTable
      columns={columns}
      getData={saGetUserTableData}
      actions={(row: any) => (
        <TableActions href={`/chatUsers/${row.id}`} />
      )}
    />
  );
};

export default usersTable;
