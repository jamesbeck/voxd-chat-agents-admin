"use server";

import db from "@/database/db";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import {
  applyInvoiceLineItemReadScope,
  canAccessBillingPages,
} from "@/lib/billingAccess";
import {
  ServerActionReadParams,
  ServerActionReadResponse,
} from "@/types/types";

const SORT_FIELD_MAP: Record<string, string> = {
  description: '"invoiceLineItem"."description"',
  serviceFromDate: '"invoiceLineItem"."serviceFromDate"',
  serviceToDate: '"invoiceLineItem"."serviceToDate"',
  quantity: '"invoiceLineItem"."quantity"',
  amount: '"invoiceLineItem"."amount"',
  VAT: '"invoiceLineItem"."VAT"',
  agentName: 'COALESCE("agent"."niceName", "agent"."name")',
  invoiceNumber: '"invoice"."number"',
  toOrganisationName: '"toOrganisation"."name"',
  toPartnerName: '"toPartnerOrganisation"."name"',
};

const saGetInvoiceLineItemTableData = async ({
  search,
  page = 1,
  pageSize = 100,
  sortField = "serviceFromDate",
  sortDirection = "desc",
  invoiceId,
  toOrganisationId,
  toPartnerId,
  unsentOnly,
}: ServerActionReadParams<{
  invoiceId?: string;
  toOrganisationId?: string;
  toPartnerId?: string | null;
  unsentOnly?: boolean;
}>): Promise<ServerActionReadResponse> => {
  const accessToken = await verifyAccessToken();

  if (!(await canAccessBillingPages({ accessToken }))) {
    return { success: false, error: "Unauthorized" };
  }

  const base = db("invoiceLineItem")
    .leftJoin("invoice", "invoice.id", "invoiceLineItem.invoiceId")
    .leftJoin("agent", "agent.id", "invoiceLineItem.agentId")
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
    .where((qb) => {
      if (search) {
        qb.where("invoiceLineItem.description", "ilike", `%${search}%`)
          .orWhere("toOrganisation.name", "ilike", `%${search}%`)
          .orWhere("toPartnerOrganisation.name", "ilike", `%${search}%`)
          .orWhere("agent.name", "ilike", `%${search}%`)
          .orWhere("agent.niceName", "ilike", `%${search}%`);

        const searchNumber = Number(search);
        if (!Number.isNaN(searchNumber)) {
          qb.orWhere("invoice.number", searchNumber);
        }
      }
    });

  if (invoiceId) {
    base.where("invoiceLineItem.invoiceId", invoiceId);
  }

  if (toOrganisationId) {
    base.where("invoiceLineItem.toOrganisationId", toOrganisationId);
  }

  if (toPartnerId !== undefined) {
    if (toPartnerId) {
      base.where("invoiceLineItem.toPartnerId", toPartnerId);
    } else {
      base.whereNull("invoiceLineItem.toPartnerId");
    }
  }

  if (unsentOnly) {
    base.whereNull("invoiceLineItem.invoiceId");
  }

  await applyInvoiceLineItemReadScope({
    query: base,
    accessToken,
  });

  const countResult = await base
    .clone()
    .clearSelect()
    .clearOrder()
    .countDistinct<{ count: string }>("invoiceLineItem.id as count")
    .first();

  const totalAvailable = countResult
    ? Number.parseInt(countResult.count, 10)
    : 0;

  const lineItems = await base
    .clone()
    .select(
      "invoiceLineItem.*",
      "invoice.number as invoiceNumber",
      "agent.id as agentId",
      "agent.name as agentName",
      "agent.niceName as agentNiceName",
      "agent.organisationId as agentOrganisationId",
      "toOrganisation.name as toOrganisationName",
      "toPartnerOrganisation.name as toPartnerName",
    )
    .orderByRaw(
      `${SORT_FIELD_MAP[sortField] || '"invoiceLineItem"."serviceFromDate"'} ${sortDirection}`,
    )
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    success: true,
    data: lineItems,
    totalAvailable,
    page,
    pageSize,
  };
};

export default saGetInvoiceLineItemTableData;
