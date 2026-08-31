"use client";

import DataTable from "@/components/adminui/Table";
import TableActions from "@/components/admin/TableActions";
import saGetPermissionGroupTableData from "@/actions/saGetPermissionGroupTableData";

export default function PermissionGroupsTable() {
  return (
    <DataTable
      tableId="permission-groups"
      defaultSort={{ name: "sortOrder", direction: "asc" }}
      columns={[
        {
          label: "Name",
          name: "name",
          sort: true,
          linkTo: (row) => `/permission-groups/${row.id}`,
        },
        {
          label: "Key",
          name: "key",
          sort: true,
        },
        {
          label: "Sort",
          name: "sortOrder",
          sort: true,
        },
        {
          label: "Definitions",
          name: "definitionCount",
          format: (row) => row.definitionCount ?? 0,
        },
        {
          label: "Updated",
          name: "updatedAt",
          sort: true,
          format: (row) =>
            row.updatedAt
              ? new Date(row.updatedAt).toLocaleDateString("en-GB")
              : "-",
        },
      ]}
      getData={saGetPermissionGroupTableData}
      actions={(row) => (
        <TableActions href={`/permission-groups/${row.id}`} />
      )}
    />
  );
}
