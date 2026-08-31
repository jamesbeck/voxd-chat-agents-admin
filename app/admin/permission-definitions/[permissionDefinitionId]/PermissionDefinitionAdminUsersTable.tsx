"use client";

import DataTable from "@/components/adminui/Table";
import TableLink from "@/components/adminui/TableLink";
import { Badge } from "@/components/ui/badge";
import saGetPermissionDefinitionAdminUserTableData from "@/actions/saGetPermissionDefinitionAdminUserTableData";

export default function PermissionDefinitionAdminUsersTable({
  permissionDefinitionId,
}: {
  permissionDefinitionId: string;
}) {
  return (
    <DataTable
      tableId={`permission-definition-admin-users-${permissionDefinitionId}`}
      defaultSort={{ name: "name", direction: "asc" }}
      getData={saGetPermissionDefinitionAdminUserTableData}
      getDataParams={{ permissionDefinitionId }}
      columns={[
        {
          label: "Admin User",
          name: "name",
          sort: true,
          format: (row) => (
            <TableLink href={`/adminUsers/${row.id}`}>
              {row.name || row.email || "Unnamed user"}
            </TableLink>
          ),
        },
        {
          label: "Email",
          name: "email",
          sort: true,
          format: (row) => row.email || "-",
        },
        {
          label: "Organisation",
          name: "organisationName",
          sort: true,
          format: (row) => row.organisationName || "-",
        },
        {
          label: "Partner",
          name: "partnerName",
          sort: true,
          format: (row) => row.partnerName || "-",
        },
        {
          label: "Status",
          name: "statusLabel",
          sort: true,
          format: (row) =>
            row.statusGranted ? (
              <Badge className="bg-emerald-600 text-white border-transparent">
                {row.statusLabel}
              </Badge>
            ) : (
              <Badge variant="outline">{row.statusLabel}</Badge>
            ),
        },
        {
          label: "Summary",
          name: "agentSummaryLabel",
          format: (row) => row.agentSummaryLabel || "-",
        },
        {
          label: "Last Login",
          name: "lastLogin",
          sort: true,
          format: (row) =>
            row.lastLogin
              ? new Date(row.lastLogin).toLocaleDateString("en-GB")
              : "-",
        },
      ]}
    />
  );
}
