import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import RecordTabs from "@/components/admin/RecordTabs";
import Container from "@/components/adminui/Container";
import DataCard from "@/components/adminui/DataCard";
import H1 from "@/components/adminui/H1";
import { TabsContent } from "@/components/ui/tabs";
import db from "@/database/db";
import {
  applyInvoiceLineItemReadScope,
  canAccessBillingPages,
  canMutateBillingRecords,
  userCanViewInvoice,
} from "@/lib/billingAccess";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import {
  getPendingInvoiceSearchParams,
  isPartnerToPartnerPendingInvoice,
} from "@/lib/pendingInvoiceGrouping";
import getInvoicePdfUrl from "@/lib/getInvoicePdfUrl";
import { notFound } from "next/navigation";
import InvoiceDetailsTab from "./invoiceDetailsTab";
import InvoiceActions from "./invoiceActions";
import InvoicePdfTab from "./invoicePdfTab";
import CreateInvoiceFromPendingButton from "../createInvoiceFromPendingButton";
import LineItemsTable from "../../line-items/lineItemsTable";

const PENDING_INVOICE_ORGANISATION_ID_SQL =
  'CASE WHEN "invoiceLineItem"."toPartnerId" IS NULL THEN "invoiceLineItem"."toOrganisationId" ELSE NULL END';

const PENDING_INVOICE_ORGANISATION_NAME_SQL =
  'CASE WHEN "invoiceLineItem"."toPartnerId" IS NULL THEN "toOrganisation"."name" ELSE NULL END';

const formatMoney = (value: number | null | undefined) => {
  if (value == null) return "-";

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value / 100);
};

export default async function Page({
  params,
  searchParams,
}: {
  params: { invoiceId: string };
  searchParams: {
    tab?: string;
    toOrganisationId?: string;
    toPartnerId?: string;
  };
}) {
  const accessToken = await verifyAccessToken();

  if (!(await canAccessBillingPages({ accessToken }))) {
    return notFound();
  }

  const invoiceId = (await params).invoiceId;
  const resolvedSearchParams = await searchParams;
  const requestedTab = resolvedSearchParams.tab || "details";
  const activeTab = ["details", "lineItems", "pdf"].includes(requestedTab)
    ? requestedTab
    : "details";

  const isPendingInvoice = invoiceId === "pending";

  if (isPendingInvoice) {
    const toOrganisationId = resolvedSearchParams.toOrganisationId;
    const toPartnerId = resolvedSearchParams.toPartnerId;

    if (!toOrganisationId && !toPartnerId) {
      return notFound();
    }

    const pendingInvoiceQuery = db("invoiceLineItem")
      .leftJoin(
        "organisation as toOrganisation",
        "toOrganisation.id",
        "invoiceLineItem.toOrganisationId",
      )
      .leftJoin(
        "organisation as toPartnerOrganisation",
        "toPartnerOrganisation.id",
        "invoiceLineItem.toPartnerId",
      )
      .whereNull("invoiceLineItem.invoiceId");

    if (toPartnerId) {
      pendingInvoiceQuery.where("invoiceLineItem.toPartnerId", toPartnerId);
    } else {
      pendingInvoiceQuery.where(
        "invoiceLineItem.toOrganisationId",
        toOrganisationId,
      );
      pendingInvoiceQuery.whereNull("invoiceLineItem.toPartnerId");
    }

    await applyInvoiceLineItemReadScope({
      query: pendingInvoiceQuery,
      accessToken,
    });

    const pendingInvoice = await pendingInvoiceQuery
      .clone()
      .groupBy("invoiceLineItem.toPartnerId", "toPartnerOrganisation.name")
      .groupByRaw(PENDING_INVOICE_ORGANISATION_ID_SQL)
      .groupByRaw(PENDING_INVOICE_ORGANISATION_NAME_SQL)
      .select(
        db.raw(`${PENDING_INVOICE_ORGANISATION_ID_SQL} as "toOrganisationId"`),
        "invoiceLineItem.toPartnerId",
        db.raw(
          `${PENDING_INVOICE_ORGANISATION_NAME_SQL} as "toOrganisationName"`,
        ),
        "toPartnerOrganisation.name as toPartnerName",
        db.raw('COUNT(*)::int as "lineItemCount"'),
        db.raw(
          'COALESCE(SUM("invoiceLineItem"."amount"), 0)::int as "totalExVat"',
        ),
      )
      .first<{
        toOrganisationId: string | null;
        toPartnerId: string | null;
        toOrganisationName: string | null;
        toPartnerName: string | null;
        lineItemCount: number;
        totalExVat: number;
      }>();

    if (!pendingInvoice) {
      return notFound();
    }

    const pendingQueryString = getPendingInvoiceSearchParams({
      toOrganisationId,
      toPartnerId,
    }).toString();

    const isPartnerToPartnerInvoice = isPartnerToPartnerPendingInvoice({
      toPartnerId,
    });
    const canEdit = await canMutateBillingRecords({ accessToken });
    const pdfUrl = toPartnerId
      ? getInvoicePdfUrl({
          toPartnerId,
          requestedByAdminUserId: accessToken.adminUserId,
        })
      : getInvoicePdfUrl({
          toOrganisationId: toOrganisationId!,
          requestedByAdminUserId: accessToken.adminUserId,
        });

    return (
      <Container>
        <BreadcrumbSetter
          breadcrumbs={[
            { label: "Admin", href: "/" },
            { label: "Billing" },
            { label: "Invoices", href: "/billing/invoices" },
            { label: "Pending Invoice" },
          ]}
        />
        <H1>Pending Invoice</H1>

        <RecordTabs
          value={activeTab}
          tabs={[
            {
              value: "details",
              label: "Details",
              href: `/billing/invoices/pending?${pendingQueryString}&tab=details`,
            },
            {
              value: "lineItems",
              label: "Line Items",
              href: `/billing/invoices/pending?${pendingQueryString}&tab=lineItems`,
            },
            {
              value: "pdf",
              label: "PDF",
              href: `/billing/invoices/pending?${pendingQueryString}&tab=pdf`,
            },
          ]}
          actions={
            canEdit ? (
              <CreateInvoiceFromPendingButton
                toOrganisationId={toOrganisationId}
                toPartnerId={toPartnerId}
                size="sm"
              />
            ) : undefined
          }
        >
          <TabsContent value="details">
            <Container>
              <DataCard
                items={[
                  {
                    label: "Status",
                    value: "Waiting to send",
                  },
                  {
                    label: "To Organisation",
                    value:
                      pendingInvoice.toOrganisationName ||
                      pendingInvoice.toOrganisationId ||
                      "-",
                  },
                  {
                    label: "To Partner",
                    value:
                      pendingInvoice.toPartnerName ||
                      pendingInvoice.toPartnerId ||
                      "-",
                  },
                  {
                    label: "Line Items",
                    value: pendingInvoice.lineItemCount,
                  },
                  {
                    label: "Total Value (ex VAT)",
                    value: formatMoney(pendingInvoice.totalExVat),
                  },
                ]}
              />
            </Container>
          </TabsContent>
          <TabsContent value="lineItems">
            <Container>
              <LineItemsTable
                toOrganisationId={
                  isPartnerToPartnerInvoice ? undefined : toOrganisationId
                }
                toPartnerId={toPartnerId ?? null}
                unsentOnly
                tableId={`admin-billing-pending-invoice-${toPartnerId ? `partner-${toPartnerId}` : `organisation-${toOrganisationId}`}-line-items`}
              />
            </Container>
          </TabsContent>
          <TabsContent value="pdf">
            <Container>
              <InvoicePdfTab pdfUrl={pdfUrl} />
            </Container>
          </TabsContent>
        </RecordTabs>
      </Container>
    );
  }

  if (!(await userCanViewInvoice({ invoiceId, accessToken }))) {
    return notFound();
  }

  const invoice = await db("invoice")
    .leftJoin(
      "organisation as toOrganisation",
      "toOrganisation.id",
      "invoice.toOrganisationId",
    )
    .leftJoin(
      "organisation as toPartnerOrganisation",
      "toPartnerOrganisation.id",
      "invoice.toPartnerId",
    )
    .select(
      "invoice.*",
      "toOrganisation.name as toOrganisationName",
      "toPartnerOrganisation.name as toPartnerName",
      db.raw(
        'COALESCE("toOrganisation"."gcMandateId", "toPartnerOrganisation"."gcMandateId") IS NOT NULL as "hasGoCardlessMandate"',
      ),
    )
    .where("invoice.id", invoiceId)
    .first();

  if (!invoice) {
    return notFound();
  }

  const canEdit = await canMutateBillingRecords({ accessToken });
  const pdfUrl = getInvoicePdfUrl({
    invoiceId,
    requestedByAdminUserId: accessToken.adminUserId,
  });

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Billing" },
          { label: "Invoices", href: "/billing/invoices" },
          { label: `#${invoice.number}` },
        ]}
      />
      <H1>Invoice #{invoice.number}</H1>

      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "details",
            label: "Details",
            href: `/billing/invoices/${invoiceId}?tab=details`,
          },
          {
            value: "lineItems",
            label: "Line Items",
            href: `/billing/invoices/${invoiceId}?tab=lineItems`,
          },
          {
            value: "pdf",
            label: "PDF",
            href: `/billing/invoices/${invoiceId}?tab=pdf`,
          },
        ]}
        actions={
          canEdit ? (
            <InvoiceActions
              invoiceId={invoiceId}
              invoiceNumber={invoice.number}
              hasGoCardlessPayment={!!invoice.gcPaymentID}
              hasGoCardlessMandate={!!invoice.hasGoCardlessMandate}
              hasInvoiceEmailSent={!!invoice.emailSentAt}
            />
          ) : undefined
        }
      >
        <TabsContent value="details">
          <Container>
            <InvoiceDetailsTab invoice={invoice} canEdit={canEdit} />
          </Container>
        </TabsContent>
        <TabsContent value="lineItems">
          <Container>
            <LineItemsTable
              invoiceId={invoiceId}
              tableId={`admin-billing-invoice-${invoiceId}-line-items`}
            />
          </Container>
        </TabsContent>
        <TabsContent value="pdf">
          <Container>
            <InvoicePdfTab pdfUrl={pdfUrl} />
          </Container>
        </TabsContent>
      </RecordTabs>
    </Container>
  );
}
