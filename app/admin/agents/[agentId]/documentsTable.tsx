"use client";

import DataTable from "@/components/adminui/Table";
import { format } from "date-fns";
import saGetDocumentTableData from "@/actions/saGetDocumentTableData";
import { Badge } from "@/components/ui/badge";
import TableActions from "@/components/admin/TableActions";
import { getKnowledgeDocumentSourceLabel } from "@/lib/knowledgeDocumentSource";

const DocumentsTable = ({ agentId }: { agentId: string }) => {
  const columns = [
    {
      label: "Title",
      name: "title",
      sort: true,
    },
    {
      label: "Description",
      name: "description",
      sort: true,
      format: (row: any) =>
        row.description
          ? row.description.length > 50
            ? `${row.description.substring(0, 50)}...`
            : row.description
          : "-",
    },
    {
      label: "Source Type",
      name: "sourceType",
      sort: true,
      format: (row: any) => getKnowledgeDocumentSourceLabel(row.sourceType),
    },
    {
      label: "Blocks",
      name: "blockCount",
      sort: true,
    },
    {
      label: "Enabled",
      name: "enabled",
      sort: true,
      format: (row: any) => (
        <Badge className={row.enabled ? "bg-green-500" : "bg-gray-500"}>
          {row.enabled ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      label: "Created",
      name: "createdAt",
      sort: true,
      format: (row: any) =>
        row.createdAt
          ? format(new Date(row.createdAt), "dd/MM/yyyy HH:mm")
          : "",
    },
  ];

  return (
    <DataTable
      defaultSort={{
        name: "createdAt",
        direction: "desc",
      }}
      getData={saGetDocumentTableData}
      getDataParams={{ agentId }}
      columns={columns}
      actions={(row: any) => (
        <TableActions href={`/agents/${agentId}/documents/${row.id}`} />
      )}
    />
  );
};

export default DocumentsTable;
