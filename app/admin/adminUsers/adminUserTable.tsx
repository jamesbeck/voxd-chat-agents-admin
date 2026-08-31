"use client";

import saGetAdminUserTableData from "@/actions/saGetAdminUserTableData";
import DataTable from "@/components/adminui/Table";
import TableLink from "@/components/adminui/TableLink";
import { formatDistanceToNow } from "date-fns";
import TableActions from "@/components/admin/TableActions";

const adminUsersTable = () => {
  const columns = [
    {
      label: "Name",
      name: "name",
      sort: true,
      // format: (value) => value || "",
    },
    {
      label: "Email",
      name: "email",
      sort: true,
      // format: (value) => value || "",
    },
    {
      label: "Organisation",
      name: "organisationName",
      format: (row: any) => {
        if (!row.organisationId) {
          return <span className="text-muted-foreground">None</span>;
        }
        return (
          <TableLink href={`/organisations/${row.organisationId}`}>
            {row.organisationName}
          </TableLink>
        );
      },
    },
    {
      label: "Partner",
      name: "partnerName",
      format: (row: any) => {
        if (!row.partnerId) {
          return <span className="text-muted-foreground">None</span>;
        }
        return (
          <TableLink href={`/organisations/${row.partnerId}`}>
            {row.partnerName}
          </TableLink>
        );
      },
    },
    {
      label: "Last Login",
      name: "lastLogin",
      sort: true,
      format: (row: any) => {
        if (!row.lastLogin) {
          return <span className="text-muted-foreground">Never</span>;
        }
        return formatDistanceToNow(new Date(row.lastLogin), {
          addSuffix: true,
        });
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      getData={saGetAdminUserTableData}
      actions={(row: any) => (
        <TableActions href={`/adminUsers/${row.id}`} />
      )}
    />
  );
};

export default adminUsersTable;
