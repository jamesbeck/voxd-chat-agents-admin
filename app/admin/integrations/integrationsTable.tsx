"use client";

import DataTable from "@/components/adminui/Table";
import saGetIntegrationTableData from "@/actions/saGetIntegrationTableData";
import TableActions from "@/components/admin/TableActions";

const IntegrationsTable = () => {
  return (
    <DataTable
      getData={saGetIntegrationTableData}
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
        <TableActions href={`/integrations/${row.id}`} />
      )}
    />
  );
};

export default IntegrationsTable;
