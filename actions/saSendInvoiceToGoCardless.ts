"use server";

import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import {
  canMutateBillingRecords,
  userCanViewInvoice,
} from "@/lib/billingAccess";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { getGoCardlessClient } from "@/lib/gocardless";
import { ServerActionResponse } from "@/types/types";

const calculateVatAmount = ({
  amount,
  vatPercentage,
}: {
  amount: number;
  vatPercentage: number;
}) => {
  return Math.round((amount * vatPercentage) / 100);
};

const getGoCardlessErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    const errorDetails = (
      error as Error & {
        errors?: Array<{
          field?: string;
          message?: string;
          request_pointer?: string;
        }>;
        requestId?: string;
      }
    ).errors;

    if (Array.isArray(errorDetails) && errorDetails.length > 0) {
      const details = errorDetails
        .map((detail) => {
          const path =
            detail.field || detail.request_pointer || "unknown field";
          const message = detail.message || "invalid value";

          return `${path}: ${message}`;
        })
        .join(", ");

      return `${error.message} (${details})`;
    }

    return error.message;
  }

  return "Failed to create GoCardless payment";
};

const saSendInvoiceToGoCardless = async ({
  invoiceId,
}: {
  invoiceId: string;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  if (!(await canMutateBillingRecords({ accessToken }))) {
    return {
      success: false,
      error: "You do not have permission to send invoices to GoCardless",
    };
  }

  if (!(await userCanViewInvoice({ invoiceId, accessToken }))) {
    return {
      success: false,
      error: "Invoice not found",
    };
  }

  const invoice = await db("invoice")
    .select(
      "invoice.id",
      "invoice.number",
      "invoice.toOrganisationId",
      "invoice.toPartnerId",
      "invoice.gcPaymentID",
    )
    .where("invoice.id", invoiceId)
    .first<{
      id: string;
      number: number;
      toOrganisationId: string | null;
      toPartnerId: string | null;
      gcPaymentID: string | null;
    }>();

  if (!invoice) {
    return {
      success: false,
      error: "Invoice not found",
    };
  }

  if (invoice.gcPaymentID) {
    return {
      success: false,
      error: "This invoice has already been sent to GoCardless",
    };
  }

  const targetOrganisationId = invoice.toOrganisationId || invoice.toPartnerId;

  if (!targetOrganisationId) {
    return {
      success: false,
      error: "Invoice is missing a billing target",
    };
  }

  const targetOrganisation = await db("organisation")
    .select("id", "name", "gcMandateId")
    .where("id", targetOrganisationId)
    .first<{
      id: string;
      name: string;
      gcMandateId: string | null;
    }>();

  if (!targetOrganisation) {
    return {
      success: false,
      error: "Billing target not found",
    };
  }

  if (!targetOrganisation.gcMandateId) {
    return {
      success: false,
      error: "Billing target is missing a GoCardless mandate ID",
    };
  }

  const lineItems = await db("invoiceLineItem")
    .select("amount", "VAT")
    .where("invoiceId", invoiceId)
    .then(
      (rows) =>
        rows as Array<{
          amount: number;
          VAT: number;
        }>,
    );

  if (lineItems.length === 0) {
    return {
      success: false,
      error: "Invoice has no line items",
    };
  }

  const totalAmount = lineItems.reduce((sum, lineItem) => {
    return (
      sum +
      lineItem.amount +
      calculateVatAmount({
        amount: lineItem.amount,
        vatPercentage: lineItem.VAT,
      })
    );
  }, 0);

  if (totalAmount <= 0) {
    return {
      success: false,
      error: "Invoice total must be greater than zero",
    };
  }

  try {
    const client = getGoCardlessClient();
    const payment = await client.payments.create(
      {
        amount: String(totalAmount),
        currency: "GBP",
        links: {
          mandate: targetOrganisation.gcMandateId,
        },
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: String(invoice.number),
          targetOrganisationId: targetOrganisation.id,
        },
      },
      `invoice:${invoice.id}`,
    );

    await db("invoice")
      .where({ id: invoiceId })
      .update({
        gcPaymentID: payment.id,
        gcStatus: payment.status,
        gcChargeDate: payment.charge_date
          ? new Date(`${payment.charge_date}T00:00:00.000Z`)
          : null,
      });

    await addLog({
      adminUserId: accessToken.adminUserId,
      event: "INVOICE_SENT_TO_GOCARDLESS",
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        targetOrganisationId: targetOrganisation.id,
        amount: totalAmount,
        gcPaymentID: payment.id,
        gcStatus: payment.status,
      },
    });

    return {
      success: true,
      data: {
        gcPaymentID: payment.id,
        gcStatus: payment.status,
      },
    };
  } catch (error) {
    console.error("Error creating GoCardless payment", error);

    return {
      success: false,
      error: getGoCardlessErrorMessage(error),
    };
  }
};

export default saSendInvoiceToGoCardless;
