"use client";

import DataTable from "@/components/adminui/Table";
import { format } from "date-fns";
import saGetPartialPromptTableData from "@/actions/saGetPartialPromptTableData";
import TableActions from "@/components/admin/TableActions";

const PartialPromptsTable = ({ agentId }: { agentId: string }) => {
  const columns = [
    {
      label: "Name",
      name: "name",
      sort: true,
    },
    {
      label: "Text",
      name: "text",
      sort: true,
      format: (row: any) =>
        row.text
          ? row.text.length > 80
            ? `${row.text.substring(0, 80)}...`
            : row.text
          : "-",
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
      getData={saGetPartialPromptTableData}
      getDataParams={{ agentId }}
      columns={columns}
      actions={(row: any) => (
        <TableActions
          href={`/agents/${agentId}/partial-prompts/${row.id}`}
        />
      )}
    />
  );
};

export default PartialPromptsTable;
