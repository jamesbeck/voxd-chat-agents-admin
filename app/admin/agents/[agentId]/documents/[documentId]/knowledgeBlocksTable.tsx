"use client";

import DataTable from "@/components/adminui/Table";
import { format } from "date-fns";
import saGetKnowledgeBlockTableData from "@/actions/saGetKnowledgeBlockTableData";
import { Badge } from "@/components/ui/badge";
import TableActions from "@/components/admin/TableActions";

const KnowledgeBlocksTable = ({
  documentId,
  agentId,
}: {
  documentId: string;
  agentId: string;
}) => {
  const columns = [
    {
      label: "Index",
      name: "blockIndex",
      sort: true,
    },
    {
      label: "Title",
      name: "title",
      sort: true,
      format: (row: any) => row.title || "-",
    },
    {
      label: "Content Preview",
      name: "content",
      sort: false,
      format: (row: any) =>
        row.content
          ? row.content.length > 80
            ? `${row.content.substring(0, 80)}...`
            : row.content
          : "-",
    },
    {
      label: "Tokens",
      name: "tokenCount",
      sort: true,
      format: (row: any) => row.tokenCount || "-",
    },
    {
      label: "Characters",
      name: "characterCount",
      sort: false,
      format: (row: any) => row.content?.length || 0,
    },
    {
      label: "Embedding",
      name: "hasEmbedding",
      sort: false,
      format: (row: any) => (
        <Badge className={row.hasEmbedding ? "bg-green-500" : "bg-red-500"}>
          {row.hasEmbedding ? "Yes" : "No"}
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
        name: "blockIndex",
        direction: "asc",
      }}
      getData={saGetKnowledgeBlockTableData}
      getDataParams={{ documentId }}
      columns={columns}
      actions={(row: any) => (
        <TableActions
          href={`/agents/${agentId}/documents/${documentId}/knowledge-blocks/${row.id}`}
        />
      )}
    />
  );
};

export default KnowledgeBlocksTable;
