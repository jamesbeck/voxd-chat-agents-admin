"use server";

import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import {
  canMutateBillingRecords,
  userCanViewInvoice,
} from "@/lib/billingAccess";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { ServerActionResponse } from "@/types/types";

const emptyToNull = (value?: string | null) => {
  const trimmedValue = value?.trim() || "";

  return trimmedValue === "" ? null : trimmedValue;
};

const saUpdateInvoice = async ({
  invoiceId,
  number,
  invoiceDate,
  dueDate,
  toOrganisationId,
  toPartnerId,
  gcPaymentID,
  gcStatus,
  gcChargeDate,
}: {
  invoiceId: string;
  number: number;
  invoiceDate: string;
  dueDate: string;
  toOrganisationId?: string;
  toPartnerId?: string;
  gcPaymentID?: string;
  gcStatus?: string;
  gcChargeDate?: string;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  if (!(await canMutateBillingRecords({ accessToken }))) {
    return {
      success: false,
      error: "You do not have permission to update invoices",
    };
  }

  if (!(await userCanViewInvoice({ invoiceId, accessToken }))) {
    return {
      success: false,
      error: "Invoice not found",
    };
  }

  await db("invoice")
    .where({ id: invoiceId })
    .update({
      number,
      invoiceDate,
      dueDate,
      toOrganisationId: emptyToNull(toOrganisationId),
      toPartnerId: emptyToNull(toPartnerId),
      gcPaymentID: emptyToNull(gcPaymentID),
      gcStatus: emptyToNull(gcStatus),
      gcChargeDate: emptyToNull(gcChargeDate),
    });

  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "INVOICE_UPDATED",
    data: {
      invoiceId,
      number,
      invoiceDate,
      dueDate,
      toOrganisationId: emptyToNull(toOrganisationId),
      toPartnerId: emptyToNull(toPartnerId),
      gcPaymentID: emptyToNull(gcPaymentID),
      gcStatus: emptyToNull(gcStatus),
      gcChargeDate: emptyToNull(gcChargeDate),
    },
  });

  return { success: true };
};

export default saUpdateInvoice;
