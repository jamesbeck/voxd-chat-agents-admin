"use client";

import DataTable from "@/components/adminui/Table";
import saGetFaqCategoryTableData from "@/actions/saGetFaqCategoryTableData";
import TableActions from "@/components/admin/TableActions";

const FaqCategoryTable = () => {
  return (
    <DataTable
      getData={saGetFaqCategoryTableData}
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
          label: "FAQ Count",
          name: "faqCount",
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
        <TableActions href={`/faq-categories/${row.id}`} label="Edit" />
      )}
    />
  );
};

export default FaqCategoryTable;
