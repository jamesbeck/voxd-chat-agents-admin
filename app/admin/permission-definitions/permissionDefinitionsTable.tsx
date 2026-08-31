"use client";

import DataTable from "@/components/adminui/Table";
import TableActions from "@/components/admin/TableActions";
import TableLink from "@/components/adminui/TableLink";
import { Badge } from "@/components/ui/badge";
import saGetPermissionDefinitionTableData from "@/actions/saGetPermissionDefinitionTableData";

const renderBooleanBadge = (
  value: boolean,
  trueLabel = "Yes",
  falseLabel = "No",
) => {
  return value ? (
    <Badge className="bg-emerald-600 text-white border-transparent">
      {trueLabel}
    </Badge>
  ) : (
    <Badge variant="outline">{falseLabel}</Badge>
  );
};

const renderScopeBadge = (scopeMode: string) => {
  return scopeMode === "agent" ? (
    <Badge className="bg-amber-500 text-white border-transparent">Agent</Badge>
  ) : (
    <Badge variant="secondary">Global</Badge>
  );
};

export default function PermissionDefinitionsTable({
  permissionGroupId,
}: {
  permissionGroupId?: string;
}) {
  return (
    <DataTable
      tableId={
        permissionGroupId
          ? `permission-definitions-${permissionGroupId}`
          : "permission-definitions"
      }
      defaultSort={{ name: "name", direction: "asc" }}
      columns={[
        {
          label: "Name",
          name: "name",
          sort: true,
          linkTo: (row) => `/permission-definitions/${row.id}`,
        },
        {
          label: "Key",
          name: "key",
          sort: true,
        },
        {
          label: "Group",
          name: "permissionGroupName",
          sort: true,
          format: (row) => (
            <TableLink
              href={`/permission-groups/${row.permissionGroupId}`}
            >
              {row.permissionGroupName}
            </TableLink>
          ),
        },
        {
          label: "Scope",
          name: "scopeMode",
          sort: true,
          format: (row) => renderScopeBadge(row.scopeMode),
        },
        {
          label: "Default",
          name: "defaultValue",
          sort: true,
          format: (row) =>
            renderBooleanBadge(
              Boolean(row.defaultValue),
              "Granted",
              "Not granted",
            ),
        },
        {
          label: "Super Admin Only",
          name: "requiresSuperAdminToManage",
          sort: true,
          format: (row) =>
            renderBooleanBadge(Boolean(row.requiresSuperAdminToManage)),
        },
        {
          label: "Assignments",
          name: "explicitGlobalAssignmentCount",
          format: (row) =>
            row.scopeMode === "agent"
              ? `${row.explicitGlobalAssignmentCount ?? 0} global, ${row.explicitAgentAssignmentCount ?? 0} agent`
              : `${row.explicitGlobalAssignmentCount ?? 0}`,
        },
      ]}
      getData={saGetPermissionDefinitionTableData}
      getDataParams={{ permissionGroupId }}
      actions={(row) => (
        <TableActions href={`/permission-definitions/${row.id}`} />
      )}
    />
  );
}
