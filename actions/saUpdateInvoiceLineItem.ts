"use server";

import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import {
  canMutateBillingRecords,
  userCanViewInvoiceLineItem,
} from "@/lib/billingAccess";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { ServerActionResponse } from "@/types/types";

const emptyToNull = (value?: string | null) => {
  const trimmedValue = value?.trim() || "";

  return trimmedValue === "" ? null : trimmedValue;
};

const saUpdateInvoiceLineItem = async ({
  lineItemId,
  invoiceId,
  agentId,
  toOrganisationId,
  toPartnerId,
  serviceFromDate,
  serviceToDate,
  quantity,
  description,
  amount,
  VAT,
}: {
  lineItemId: string;
  invoiceId?: string;
  agentId?: string;
  toOrganisationId?: string;
  toPartnerId?: string;
  serviceFromDate?: string;
  serviceToDate?: string;
  quantity: string;
  description: string;
  amount: number;
  VAT: number;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();
  const resolvedToOrganisationId = emptyToNull(toOrganisationId);
  const resolvedToPartnerId = emptyToNull(toPartnerId);
  const resolvedInvoiceId = emptyToNull(invoiceId);
  const resolvedAgentId = emptyToNull(agentId);
  const resolvedServiceFromDate = emptyToNull(serviceFromDate);
  const resolvedServiceToDate = emptyToNull(serviceToDate);

  if (!(await canMutateBillingRecords({ accessToken }))) {
    return {
      success: false,
      error: "You do not have permission to update line items",
    };
  }

  if (!(await userCanViewInvoiceLineItem({ lineItemId, accessToken }))) {
    return {
      success: false,
      error: "Line item not found",
    };
  }

  if (!!resolvedToOrganisationId === !!resolvedToPartnerId) {
    return {
      success: false,
      error:
        "Select exactly one billing target: either to organisation or to partner.",
    };
  }

  await db("invoiceLineItem").where({ id: lineItemId }).update({
    invoiceId: resolvedInvoiceId,
    agentId: resolvedAgentId,
    toOrganisationId: resolvedToOrganisationId,
    toPartnerId: resolvedToPartnerId,
    serviceFromDate: resolvedServiceFromDate,
    serviceToDate: resolvedServiceToDate,
    quantity,
    description,
    amount,
    VAT,
  });

  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "INVOICE_LINE_ITEM_UPDATED",
    data: {
      lineItemId,
      invoiceId: resolvedInvoiceId,
      agentId: resolvedAgentId,
      toOrganisationId: resolvedToOrganisationId,
      toPartnerId: resolvedToPartnerId,
      serviceFromDate: resolvedServiceFromDate,
      serviceToDate: resolvedServiceToDate,
      quantity,
      description,
      amount,
      VAT,
    },
  });

  return { success: true };
};

export default saUpdateInvoiceLineItem;
