"use client";

import DataTable, { Column } from "@/components/adminui/Table";
import TableLink from "@/components/adminui/TableLink";
import { format, formatDistance } from "date-fns";
import saGetSessionTableData from "@/actions/saGetSessionsTableData";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import saEndSession from "@/actions/saEndSession";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { XCircleIcon } from "lucide-react";
import TableActions from "@/components/admin/TableActions";
import { getSessionStatus } from "@/lib/sessionStatus";

const SessionsTable = ({
  userId,
  superAdmin,
}: {
  userId: string;
  superAdmin: boolean;
}) => {
  const router = useRouter();

  const handleCloseSession = async (sessionId: string, agentName: string) => {
    const saResponse = await saEndSession({ sessionId });

    if (!saResponse.success) {
      toast.error(
        `Error Closing Session: ${
          saResponse.error || "There was an error closing the session"
        }`,
      );
      return;
    }

    toast.success(`Successfully closed session for ${agentName}`);
    router.refresh();
  };

  const columns: Column[] = [
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
      getDataParams={{ userId }}
      columns={columns}
      actions={(row: any) => (
        <TableActions
          buttons={[
            {
              label: "View",
              href: `/sessions/${row.id}`,
              hidden: row.sessionType === "development" && !superAdmin,
            },
            {
              label: "Close",
              icon: <XCircleIcon />,
              variant: "destructive",
              hidden: !!row.closedAt || row.deletedByUser,
              confirm: {
                title: "Close Session",
                description:
                  "Are you sure you want to close this session? The session will be marked as closed and any further messages from the user will start a brand new session.",
                actionText: "Close Session",
                destructive: true,
                onAction: () => handleCloseSession(row.id, row.agentName),
              },
            },
          ]}
        />
      )}
    />
  );
};

export default SessionsTable;
