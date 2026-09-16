"use server";

import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import {
  canMutateBillingRecords,
  userCanViewInvoice,
} from "@/lib/billingAccess";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import userCanViewOrganisation from "@/lib/organisationAccess";
import userCanViewAgent from "@/lib/userCanViewAgent";
import { ServerActionResponse } from "@/types/types";

const emptyToNull = (value?: string | null) => {
  const trimmedValue = value?.trim() || "";

  return trimmedValue === "" ? null : trimmedValue;
};

const saCreateInvoiceLineItem = async ({
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
      error: "You do not have permission to create line items",
    };
  }

  if (
    resolvedAgentId &&
    !(await userCanViewAgent({ agentId: resolvedAgentId, accessToken }))
  ) {
    return {
      success: false,
      error: "Agent not found",
    };
  }

  if (!!resolvedToOrganisationId === !!resolvedToPartnerId) {
    return {
      success: false,
      error:
        "Select exactly one billing target: either to organisation or to partner.",
    };
  }

  if (
    resolvedToOrganisationId &&
    !(await userCanViewOrganisation({
      organisationId: resolvedToOrganisationId,
      accessToken,
    }))
  ) {
    return {
      success: false,
      error: "To organisation not found",
    };
  }

  if (
    resolvedToPartnerId &&
    !(await userCanViewOrganisation({
      organisationId: resolvedToPartnerId,
      accessToken,
    }))
  ) {
    return {
      success: false,
      error: "To partner not found",
    };
  }

  if (
    resolvedInvoiceId &&
    !(await userCanViewInvoice({ invoiceId: resolvedInvoiceId, accessToken }))
  ) {
    return {
      success: false,
      error: "Invoice not found",
    };
  }

  const createdLineItem = await db("invoiceLineItem")
    .insert({
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
    })
    .returning(["id"]);

  const lineItemId = createdLineItem[0]?.id;

  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "INVOICE_LINE_ITEM_CREATED",
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

  return {
    success: true,
    data: { lineItemId },
  };
};

export default saCreateInvoiceLineItem;
