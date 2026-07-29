"use server";

import db from "../database/db";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import {
  ServerActionReadResponse,
  ServerActionReadParams,
} from "@/types/types";
import { applyQuoteReadScope } from "@/lib/quoteAccess";
import { applyPartnerBranchScope } from "@/lib/organisationAccess";

const SORT_COLUMNS: Record<string, string> = {
  id: "quote.id",
  organisationName: "organisation.name",
  title: "quote.title",
  archived: "quote.archived",
  lastViewedAt: "lastViewed.lastViewedAt",
  partnerName: "partnerOrganisation.name",
  ownerName: "owner.name",
  createdAt: "quote.createdAt",
};

const saGetQuoteTableData = async ({
  search,
  page = 1,
  pageSize = 100,
  sortField = "id",
  sortDirection = "asc",
  organisationId,
  partnerId,
  archived = false,
  ownerId,
}: ServerActionReadParams & {
  organisationId?: string;
  partnerId?: string;
  archived?: boolean;
  ownerId?: string;
}): Promise<ServerActionReadResponse> => {
  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin && !accessToken.partner)
    return {
      success: false,
      error: "You do not have permission to view organisations.",
    };

  const base = db("quote")
    .leftJoin("organisation", "organisation.id", "quote.organisationId")
    .leftJoin(
      "organisation as partnerOrganisation",
      "partnerOrganisation.id",
      "organisation.partnerId",
    )
    .leftJoin("adminUser as owner", "owner.id", "quote.createdByAdminUserId")
    .groupBy(
      "quote.id",
      "organisation.id",
      "partnerOrganisation.id",
      "owner.id",
    )
    .where((qb) => {
      if (search) {
        qb.where("organisation.name", "ilike", `%${search}%`);
        qb.orWhere("quote.title", "ilike", `%${search}%`);
      }
    });

  if (organisationId) base.where("quote.organisationId", organisationId);

  base.where("quote.archived", archived);

  await applyQuoteReadScope({
    query: base,
    accessToken,
  });

  if ((accessToken?.superAdmin || accessToken?.partner) && partnerId) {
    applyPartnerBranchScope({
      query: base,
      rootPartnerId: partnerId,
    });
  }

  // Filter by owner (createdByAdminUserId)
  if (ownerId) {
    base.where("quote.createdByAdminUserId", ownerId);
  }

  //count query
  const countQuery = base.clone().select("organisation.id");
  const countResult = await db
    .count<{ count: string }>("id")
    .from(countQuery)
    .first();

  const totalAvailable = countResult ? parseInt(countResult.count) : 0;

  // Subquery to get the latest view datetime for each quote
  // Excludes views from users belonging to the same partner
  const partnerEmails = accessToken.partnerId
    ? db("adminUser")
        .leftJoin("organisation", "adminUser.organisationId", "organisation.id")
        .select("email")
        .where("organisation.id", accessToken.partnerId)
        .where("organisation.partner", true)
        .whereNotNull("email")
    : null;

  const lastViewedSubquery = db("quoteView")
    .select("quoteId")
    .max("datetime as lastViewedAt")
    .where((qb) => {
      if (partnerEmails) {
        qb.whereNull("loggedInEmail").orWhereNotIn(
          "loggedInEmail",
          partnerEmails,
        );
      }
    })
    .groupBy("quoteId")
    .as("lastViewed");

  const resolvedSortField = SORT_COLUMNS[sortField] || SORT_COLUMNS.id;
  const resolvedSortDirection = sortDirection === "desc" ? "desc" : "asc";

  const quotes = await base
    .clone()
    .leftJoin(lastViewedSubquery, "lastViewed.quoteId", "quote.id")
    .groupBy("lastViewed.lastViewedAt")
    .select(
      "quote.*",
      "organisation.name as organisationName",
      "partnerOrganisation.name as partnerName",
      "partnerOrganisation.id as partnerId",
      "lastViewed.lastViewedAt",
      "owner.name as ownerName",
    )

    // .select([db.raw('COUNT("agent"."id")::int as "agentCount"')])
    .orderBy(
      resolvedSortField,
      resolvedSortDirection,
      sortField === "lastViewedAt" ? "last" : undefined,
    )
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    success: true,
    data: quotes,
    totalAvailable,
    page,
    pageSize,
  };
};

export default saGetQuoteTableData;
