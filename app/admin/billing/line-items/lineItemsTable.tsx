"use client";

import DataTable from "@/components/adminui/Table";
import TableActions from "@/components/admin/TableActions";
import TableLink from "@/components/adminui/TableLink";
import saGetInvoiceLineItemTableData from "@/actions/saGetInvoiceLineItemTableData";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import CreateLineItemDialog from "./CreateLineItemDialog";

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

const formatVat = (value: number | null | undefined) => {
  if (value == null) return "-";

  return `${value}%`;
};

export default function LineItemsTable({
  invoiceId,
  toOrganisationId,
  toPartnerId,
  unsentOnly,
  agentOptions = [],
  organisationOptions = [],
  partnerOptions = [],
  tableId = "admin-billing-line-items",
}: {
  invoiceId?: string;
  toOrganisationId?: string;
  toPartnerId?: string | null;
  unsentOnly?: boolean;
  agentOptions?: { value: string; label: string }[];
  organisationOptions?: { value: string; label: string }[];
  partnerOptions?: { value: string; label: string }[];
  tableId?: string;
}) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const canCreateLineItems =
    agentOptions.length > 0 &&
    organisationOptions.length > 0 &&
    partnerOptions.length > 0;

  const columns = [
    {
      label: "Description",
      name: "description",
      sort: true,
      linkTo: (row: any) => `/admin/billing/line-items/${row.id}`,
    },
    {
      label: "To Organisation",
      name: "toOrganisationName",
      sort: true,
      format: (row: any) => (
        <TableLink href={`/admin/organisations/${row.toOrganisationId}`}>
          {row.toOrganisationName || row.toOrganisationId}
        </TableLink>
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
      label: "Agent",
      name: "agentName",
      sort: true,
      format: (row: any) => (
        <TableLink href={`/admin/agents/${row.agentId}`}>
          {row.agentNiceName || row.agentName}
        </TableLink>
      ),
    },
    {
      label: "Invoice",
      name: "invoiceNumber",
      sort: true,
      format: (row: any) =>
        row.invoiceId ? (
          <TableLink href={`/admin/billing/invoices/${row.invoiceId}`}>
            #{row.invoiceNumber}
          </TableLink>
        ) : (
          "-"
        ),
    },
    {
      label: "Service From",
      name: "serviceFromDate",
      sort: true,
      format: (row: any) => formatDate(row.serviceFromDate),
    },
    {
      label: "Service To",
      name: "serviceToDate",
      sort: true,
      format: (row: any) => formatDate(row.serviceToDate),
    },
    {
      label: "Quantity",
      name: "quantity",
      sort: true,
    },
    {
      label: "Amount",
      name: "amount",
      sort: true,
      format: (row: any) => formatMoney(row.amount),
    },
    {
      label: "VAT",
      name: "VAT",
      sort: true,
      format: (row: any) => formatVat(row.VAT),
    },
  ];

  return (
    <>
      {canCreateLineItems ? (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setCreateDialogOpen(true)}>
            Add Line Item
          </Button>
        </div>
      ) : null}

      <DataTable
        tableId={tableId}
        defaultSort={{
          name: "serviceFromDate",
          direction: "desc",
        }}
        getData={saGetInvoiceLineItemTableData}
        getDataParams={{
          invoiceId,
          toOrganisationId,
          toPartnerId,
          unsentOnly,
        }}
        columns={columns}
        actions={(row: any) => (
          <TableActions href={`/admin/billing/line-items/${row.id}`} />
        )}
      />

      {canCreateLineItems ? (
        <CreateLineItemDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          agentOptions={agentOptions}
          organisationOptions={organisationOptions}
          partnerOptions={partnerOptions}
        />
      ) : null}
    </>
  );
}
