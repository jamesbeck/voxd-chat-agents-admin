"use client";

import { format, formatDistance } from "date-fns";
import saGetTemplateMessageSendTableData from "@/actions/saGetTemplateMessageSendTableData";
import Table from "@/components/adminui/Table";
import TableActions from "@/components/admin/TableActions";
import { Badge } from "@/components/ui/badge";

const TemplateHistoryTable = ({ agentId }: { agentId: string }) => {
  const columns = [
    {
      label: "Template",
      name: "templateName",
      sort: true,
      format: (row: any) => row.templateName || "Unknown template",
    },
    {
      label: "Sent By",
      name: "createdByAdminUserName",
      sort: true,
      format: (row: any) => row.createdByAdminUserName || "Unknown admin",
    },
    {
      label: "Recipients",
      name: "attemptCount",
      sort: true,
      format: (row: any) => row.attemptCount || 0,
    },
    {
      label: "Successes",
      name: "successCount",
      sort: true,
      format: (row: any) => (
        <Badge className="bg-green-500">{row.successCount || 0}</Badge>
      ),
    },
    {
      label: "Failures",
      name: "failureCount",
      sort: true,
      format: (row: any) =>
        row.failureCount ? (
          <Badge variant="destructive">{row.failureCount}</Badge>
        ) : (
          <Badge variant="outline">0</Badge>
        ),
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
      actions={(row: any) => (
        <TableActions
          href={`/agents/${agentId}/template-history/${row.id}`}
          label="View Sends"
        />
      )}
      getData={saGetTemplateMessageSendTableData}
      getDataParams={{ agentId }}
      defaultSort={{ name: "createdAt", direction: "desc" }}
    />
  );
};

export default TemplateHistoryTable;
