"use client";

import DataTable from "@/components/adminui/Table";
import TableLink from "@/components/adminui/TableLink";
import { format, formatDistance } from "date-fns";
import saGetSupportTicketTableData from "@/actions/saGetSupportTicketTableData";
import TableActions from "@/components/admin/TableActions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SupportTicketsTableProps {
  statusFilter?: "open" | "closed" | "awaiting" | "backlog";
}

const SupportTicketsTable = ({
  statusFilter = "open",
}: SupportTicketsTableProps) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-red-500";
      case "in progress":
        return "bg-blue-500";
      case "awaiting client":
        return "bg-orange-500";
      case "closed":
        return "bg-green-500";
      case "back log":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const columns = [
    {
      label: "#",
      name: "ticketNumber",
      sort: true,
      format: (row: any) => `#${row.ticketNumber}`,
    },
    {
      label: "Title",
      name: "title",
      sort: true,
    },
    {
      label: "Status",
      name: "status",
      sort: true,
      format: (row: any) => (
        <Badge className={cn(getStatusColor(row.status))}>{row.status}</Badge>
      ),
    },
    {
      label: "Agent",
      name: "agentName",
      sort: true,
      format: (row: any) =>
        row.agentId && row.agentName ? (
          <TableLink href={`/agents/${row.agentId}`}>
            {row.agentName}
          </TableLink>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      label: "Created By",
      name: "createdByName",
      sort: true,
      format: (row: any) => row.createdByName || row.createdByEmail || "-",
    },
    {
      label: "Created",
      name: "createdAt",
      sort: true,
      format: (row: any) =>
        row.createdAt
          ? `${format(row.createdAt, "dd/MM/yyyy HH:mm")} (${formatDistance(
              row.createdAt,
              new Date(),
              { addSuffix: true },
            )})`
          : "",
    },
  ];

  return (
    <DataTable
      defaultSort={{
        name: "createdAt",
        direction: "desc",
      }}
      getData={saGetSupportTicketTableData}
      getDataParams={{ statusFilter }}
      columns={columns}
      actions={(row: any) => (
        <TableActions href={`/support-tickets/${row.id}`} />
      )}
    />
  );
};

export default SupportTicketsTable;
