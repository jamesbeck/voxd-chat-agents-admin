"use client";

import DataTable from "@/components/adminui/Table";
import { Badge } from "@/components/ui/badge";
import saGetQuoteTableData from "@/actions/saGetQuoteTableData";
import { format } from "date-fns";
import TableActions from "@/components/admin/TableActions";

const getArchiveBadge = (archived: boolean) => {
  if (!archived) {
    return <Badge variant="secondary">Active</Badge>;
  }

  return <Badge variant="outline">Archived</Badge>;
};

const QuotesTable = ({ organisationId }: { organisationId: string }) => {
  const columns = [
    {
      label: "Title",
      name: "title",
      sort: true,
      linkTo: (row: any) => `/quotes/${row.id}`,
      format: (row: any) => row.title || "",
    },
    {
      label: "Status",
      name: "archived",
      sort: true,
      format: (row: any) => getArchiveBadge(Boolean(row.archived)),
    },
    {
      label: "Created At",
      name: "createdAt",
      sort: true,
      format: (row: any) => format(new Date(row.createdAt), "dd/MM/yyyy") || "",
    },
    {
      label: "Organisation",
      name: "organisationName",
      sort: true,
      linkTo: (row: any) => `/organisations/${row.organisationId}`,
      // format: (value: string) => value || "",}
    },
  ];

  const actions = (row: any) => (
    <TableActions href={`/quotes/${row.id}`} />
  );

  return (
    <DataTable
      getData={saGetQuoteTableData}
      getDataParams={{ organisationId, archived: false }}
      columns={columns}
      actions={actions}
    />
  );
};

export default QuotesTable;
