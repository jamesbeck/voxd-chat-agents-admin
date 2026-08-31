"use client";

import DataTable from "@/components/adminui/Table";
import TableLink from "@/components/adminui/TableLink";
import { format, formatDistance } from "date-fns";
import saGetSessionTableData from "@/actions/saGetSessionsTableData";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import TableActions from "@/components/admin/TableActions";
import { getSessionStatus } from "@/lib/sessionStatus";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SessionsTable = ({ superAdmin }: { superAdmin: boolean }) => {
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
      label: "Agent",
      name: "agentName",
      sort: true,
      format: (row: any) => (
        <TableLink href={`/agents/${row.agentId}`}>
          {row.agentName}
        </TableLink>
      ),
    },
    {
      label: "Name",
      name: "name",
      sort: true,
      format: (row: any) =>
        row.name ? (
          <TableLink href={`/chatUsers/${row.userId}`}>
            {row.name}
          </TableLink>
        ) : (
          <Badge className="bg-gray-500">Anonymous</Badge>
        ),
    },
    {
      label: "Number",
      name: "number",
      sort: true,
    },
    {
      label: "Email",
      name: "email",
      sort: true,
    },
    {
      label: "External ID",
      name: "externalId",
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
      getDataParams={{}}
      columns={columns}
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
