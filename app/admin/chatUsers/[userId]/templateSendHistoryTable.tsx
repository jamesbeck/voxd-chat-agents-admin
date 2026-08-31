"use client";

import { format, formatDistance } from "date-fns";
import Table from "@/components/adminui/Table";
import TableActions from "@/components/admin/TableActions";
import { Badge } from "@/components/ui/badge";
import saGetTemplateSendAttemptTableData from "@/actions/saGetTemplateSendAttemptTableData";

const TemplateSendHistoryTable = ({
  agentId,
  userId,
}: {
  agentId: string;
  userId: string;
}) => {
  const columns = [
    {
      label: "Template",
      name: "templateName",
      sort: true,
      format: (row: any) => row.templateName || "Unknown template",
    },
    {
      label: "Success",
      name: "success",
      sort: true,
      format: (row: any) =>
        row.success ? (
          <Badge className="bg-green-500">Yes</Badge>
        ) : (
          <Badge variant="destructive">No</Badge>
        ),
    },
    {
      label: "Error",
      name: "error",
      format: (row: any) => row.error || "",
    },
    {
      label: "Sent At",
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
    <Table
      columns={columns}
      actions={(row: any) =>
        row.templateMessageSendId ? (
          <TableActions
            href={`/agents/${agentId}/template-history/${row.templateMessageSendId}`}
            label="View Send"
          />
        ) : null
      }
      getData={saGetTemplateSendAttemptTableData}
      getDataParams={{ agentId, chatUserId: userId }}
      defaultSort={{ name: "createdAt", direction: "desc" }}
    />
  );
};

export default TemplateSendHistoryTable;
