"use server";

import {
  ServerActionReadResponse,
  ServerActionReadParams,
} from "@/types/types";
import db from "../database/db";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import {
  applyOrganisationReadScope,
  canAdminUserReadAllOrganisations,
} from "@/lib/organisationAccess";

const saGetProviderApiKeyTableData = async ({
  search,
  page = 1,
  pageSize = 100,
  sortField = "createdAt",
  sortDirection = "desc",
  organisationId,
}: ServerActionReadParams & {
  organisationId?: string;
}): Promise<ServerActionReadResponse> => {
  const accessToken = await verifyAccessToken();

  const base = db("providerApiKey")
    .leftJoin("provider", "providerApiKey.providerId", "provider.id")
    .leftJoin(
      "organisation",
      "providerApiKey.organisationId",
      "organisation.id",
    )
    .where((qb) => {
      if (search) {
        qb.where("providerApiKey.key", "ilike", `%${search}%`)
          .orWhere("provider.name", "ilike", `%${search}%`)
          .orWhere("organisation.name", "ilike", `%${search}%`);
      }
    });

  await applyOrganisationReadScope({
    query: base,
    accessToken,
    includeRootPartnerOrganisation: true,
  });

  if (organisationId) {
    base.where("providerApiKey.organisationId", organisationId);
  }

  if (accessToken.partner && !accessToken.superAdmin) {
    const canReadAllOrganisations = await canAdminUserReadAllOrganisations({
      accessToken,
    });

    if (!canReadAllOrganisations && accessToken.partnerId) {
      base.where((qb) => {
        qb.where("providerApiKey.organisationId", accessToken.partnerId).orWhere(
          "organisation.ownerId",
          accessToken.adminUserId,
        );
      });
    }
  }

  const countQuery = base.clone().select("providerApiKey.id");
  const countResult = await db
    .count<{ count: string }>("id")
    .from(countQuery)
    .first();
  const totalAvailable = countResult ? parseInt(countResult.count) : 0;

  const dataQuery = base
    .clone()
    .select(
      "providerApiKey.id",
      "providerApiKey.key",
      "providerApiKey.createdAt",
      "providerApiKey.providerId",
      "providerApiKey.organisationId",
      "provider.name as providerName",
      "organisation.name as organisationName",
      db.raw(
        `(SELECT COUNT(*) FROM "providerApiKey" AS pk2 WHERE pk2."key" = "providerApiKey"."key" AND pk2."organisationId" != "providerApiKey"."organisationId")::int as "duplicateKeyCount"`,
      ),
      db.raw(
        `COALESCE((SELECT json_agg(json_build_object('id', a."id", 'name', a."niceName")) FROM "agent" a WHERE a."providerApiKeyId" = "providerApiKey"."id" OR a."embeddingProviderApiKeyId" = "providerApiKey"."id"), '[]'::json) as "agents"`,
      ),
      db.raw(
        `COALESCE((SELECT json_agg(json_build_object('id', o."id", 'name', o."name")) FROM "organisation" o WHERE o."partner" = true AND o."providerApiKeyId" = "providerApiKey"."id"), '[]'::json) as "partners"`,
      ),
    )
    .orderBy(sortField, sortDirection)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const data = await dataQuery;

  return {
    success: true,
    data,
    totalAvailable,
    page,
    pageSize,
  };
};

export default saGetProviderApiKeyTableData;
