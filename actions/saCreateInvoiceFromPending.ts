"use server";

import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import {
  applyInvoiceLineItemReadScope,
  canMutateBillingRecords,
} from "@/lib/billingAccess";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import getNextInvoiceNumber from "@/lib/getNextInvoiceNumber";
import { ServerActionResponse } from "@/types/types";

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

const saCreateInvoiceFromPending = async ({
  fromPartnerId,
  toOrganisationId,
  toPartnerId,
}: {
  fromPartnerId: string;
  toOrganisationId?: string | null;
  toPartnerId?: string | null;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  if (!(await canMutateBillingRecords({ accessToken }))) {
    return {
      success: false,
      error: "You do not have permission to create invoices",
    };
  }

  if (!fromPartnerId) {
    return {
      success: false,
      error: "A billing partner is required",
    };
  }

  if (toPartnerId) {
    return {
      success: false,
      error:
        "Partner-to-partner invoice creation is blocked until the invoice schema supports partner-only targets",
    };
  }

  if (!toOrganisationId) {
    return {
      success: false,
      error: "A destination organisation is required",
    };
  }

  try {
    const data = await db.transaction(async (trx) => {
      const scopedPendingItemsQuery = trx("invoiceLineItem")
        .whereNull("invoiceLineItem.invoiceId")
        .where("invoiceLineItem.fromPartnerId", fromPartnerId)
        .where("invoiceLineItem.toOrganisationId", toOrganisationId)
        .whereNull("invoiceLineItem.toPartnerId");

      await applyInvoiceLineItemReadScope({
        query: scopedPendingItemsQuery,
        accessToken,
        trx,
      });

      const pendingItems = await scopedPendingItemsQuery
        .clone()
        .select("invoiceLineItem.id")
        .forUpdate();

      if (pendingItems.length === 0) {
        throw new Error(
          "No pending invoice line items were found for this invoice",
        );
      }

      const invoiceNumber = await getNextInvoiceNumber({ trx });
      const invoiceDate = new Date();
      const dueDate = addDays(invoiceDate, 14);

      const [invoice] = await trx("invoice")
        .insert({
          number: invoiceNumber,
          invoiceDate: toDateString(invoiceDate),
          dueDate: toDateString(dueDate),
          toOrganisationId,
          fromPartnerId,
          toPartnerId: null,
        })
        .returning(["id", "number"]);

      await trx("invoiceLineItem")
        .whereIn(
          "id",
          pendingItems.map((item) => item.id),
        )
        .update({
          invoiceId: invoice.id,
        });

      return {
        id: invoice.id,
        number: invoice.number,
        lineItemCount: pendingItems.length,
      };
    });

    await addLog({
      adminUserId: accessToken.adminUserId,
      event: "INVOICE_CREATED",
      data: {
        invoiceId: data.id,
        number: data.number,
        fromPartnerId,
        toOrganisationId,
        lineItemCount: data.lineItemCount,
        createdFromPending: true,
      },
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "There was an error creating the invoice",
    };
  }
};

export default saCreateInvoiceFromPending;
