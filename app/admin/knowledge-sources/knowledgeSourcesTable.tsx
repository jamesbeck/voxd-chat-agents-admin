"use client";

import DataTable from "@/components/adminui/Table";
import saGetKnowledgeSourceTableData from "@/actions/saGetKnowledgeSourceTableData";
import TableActions from "@/components/admin/TableActions";

const KnowledgeSourcesTable = () => {
  return (
    <DataTable
      getData={saGetKnowledgeSourceTableData}
      defaultSort={{
        name: "name",
        direction: "asc",
      }}
      columns={[
        {
          label: "Name",
          name: "name",
          sort: true,
        },
        {
          label: "Description",
          name: "description",
          sort: false,
          format: (row: any) => (
            <span className="line-clamp-2 max-w-md">{row.description}</span>
          ),
        },
        {
          label: "Setup Hours",
          name: "setupHours",
          sort: true,
        },
        {
          label: "Created",
          name: "createdAt",
          sort: true,
          format: (row: any) => new Date(row.createdAt).toLocaleDateString(),
        },
      ]}
      actions={(row: any) => (
        <TableActions href={`/knowledge-sources/${row.id}`} />
      )}
    />
  );
};

export default KnowledgeSourcesTable;
