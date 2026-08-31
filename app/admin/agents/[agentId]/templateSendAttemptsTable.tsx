"use client";

import { format, formatDistance } from "date-fns";
import saGetTemplateSendAttemptTableData from "@/actions/saGetTemplateSendAttemptTableData";
import Table from "@/components/adminui/Table";
import TableLink from "@/components/adminui/TableLink";
import { Badge } from "@/components/ui/badge";

const TemplateSendAttemptsTable = ({
  agentId,
  templateMessageSendId,
}: {
  agentId: string;
  templateMessageSendId: string;
}) => {
  const columns = [
    {
      label: "User Name",
      name: "chatUserName",
      sort: true,
      format: (row: any) =>
        row.chatUserId && row.chatUserName ? (
          <TableLink href={`/chatUsers/${row.chatUserId}`}>
            {row.chatUserName}
          </TableLink>
        ) : (
          row.chatUserName || "-"
        ),
    },
    {
      label: "Number",
      name: "chatUserNumber",
      sort: true,
    },
    {
      label: "Email",
      name: "chatUserEmail",
      sort: true,
    },
    {
      label: "Template",
      name: "templateName",
      sort: true,
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
      getData={saGetTemplateSendAttemptTableData}
      getDataParams={{ agentId, templateMessageSendId }}
      defaultSort={{ name: "createdAt", direction: "desc" }}
    />
  );
};

export default TemplateSendAttemptsTable;
