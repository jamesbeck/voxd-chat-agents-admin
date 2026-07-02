"use client";

import DataTable from "@/components/adminui/Table";
import TableActions from "@/components/admin/TableActions";
import TableLink from "@/components/adminui/TableLink";
import saGetInvoiceTableData from "@/actions/saGetInvoiceTableData";
import { getPendingInvoiceSearchParams } from "@/lib/pendingInvoiceGrouping";
import { format } from "date-fns";
import CreateInvoiceFromPendingButton from "./createInvoiceFromPendingButton";

const getInvoiceHref = (row: any) => {
  if (!row.isPlaceholder) {
    return `/admin/billing/invoices/${row.id}`;
  }

  const params = getPendingInvoiceSearchParams({
    fromPartnerId: row.fromPartnerId,
    toOrganisationId: row.toOrganisationId,
  });

  if (row.toPartnerId) {
    params.set("toPartnerId", row.toPartnerId);
  }

  return `/admin/billing/invoices/pending?${params.toString()}`;
};

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "-";

  return format(new Date(value), "dd/MM/yyyy");
};

const formatMoney = (value: number | null | undefined) => {
  if (value == null) return "-";

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value / 100);
};

export default function InvoicesTable() {
  const columns = [
    {
      label: "Invoice #",
      name: "number",
      sort: true,
      format: (row: any) => (
        <TableLink href={getInvoiceHref(row)}>
          {row.isPlaceholder ? (
            <span className="text-muted-foreground">Pending</span>
          ) : (
            `#${row.number}`
          )}
        </TableLink>
      ),
    },
    {
      label: "Sent",
      name: "sent",
      sort: true,
      format: (row: any) => (row.sent ? "Sent" : "Waiting to send"),
    },
    {
      label: "Invoice Date",
      name: "invoiceDate",
      sort: true,
      format: (row: any) => formatDate(row.invoiceDate),
    },
    {
      label: "Due Date",
      name: "dueDate",
      sort: true,
      format: (row: any) => formatDate(row.dueDate),
    },
    {
      label: "Total Value (ex VAT)",
      name: "totalExVat",
      sort: true,
      format: (row: any) => formatMoney(row.totalExVat),
    },
    {
      label: "From Partner",
      name: "fromPartnerName",
      sort: true,
      format: (row: any) => (
        <TableLink href={`/admin/organisations/${row.fromPartnerId}`}>
          {row.fromPartnerName || "-"}
        </TableLink>
      ),
    },
    {
      label: "To Organisation",
      name: "toOrganisationName",
      sort: true,
      format: (row: any) =>
        row.toOrganisationId ? (
          <TableLink href={`/admin/organisations/${row.toOrganisationId}`}>
            {row.toOrganisationName || row.toOrganisationId}
          </TableLink>
        ) : (
          "-"
        ),
    },
    {
      label: "To Partner",
      name: "toPartnerName",
      sort: true,
      format: (row: any) =>
        row.toPartnerId ? (
          <TableLink href={`/admin/organisations/${row.toPartnerId}`}>
            {row.toPartnerName || row.toPartnerId}
          </TableLink>
        ) : (
          "-"
        ),
    },
    {
      label: "GC Payment ID",
      name: "gcPaymentID",
      sort: true,
      format: (row: any) => row.gcPaymentID || "-",
    },
    {
      label: "GC Status",
      name: "gcStatus",
      sort: true,
      format: (row: any) => row.gcStatus || "-",
    },
    {
      label: "GC Charge Date",
      name: "gcChargeDate",
      sort: true,
      format: (row: any) => formatDate(row.gcChargeDate),
    },
  ];

  return (
    <DataTable
      tableId="admin-billing-invoices"
      defaultSort={{
        name: "sent",
        direction: "desc",
      }}
      getData={saGetInvoiceTableData}
      columns={columns}
      actions={(row: any) => (
        <TableActions
          custom={
            row.isPlaceholder ? (
              <CreateInvoiceFromPendingButton
                fromPartnerId={row.fromPartnerId}
                toOrganisationId={row.toOrganisationId}
                toPartnerId={row.toPartnerId}
              />
            ) : undefined
          }
          buttons={[
            {
              label: "View",
              href: getInvoiceHref(row),
            },
          ]}
        />
      )}
      headerActions={undefined}
    />
  );
}
