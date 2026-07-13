"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import userCanViewOrganisation from "@/lib/organisationAccess";

const saDeleteProviderApiKey = async ({
  providerApiKeyId,
}: {
  providerApiKeyId: string;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  const providerApiKey = await db("providerApiKey")
    .select("id", "organisationId")
    .where({ id: providerApiKeyId })
    .first();

  if (!providerApiKey?.organisationId) {
    return { success: false, error: "Provider API key not found" };
  }

  const canViewOrganisation = await userCanViewOrganisation({
    organisationId: providerApiKey.organisationId,
    accessToken,
  });

  if (!canViewOrganisation) {
    return { success: false, error: "Unauthorized" };
  }

  // Check for references from agents or partners
  const agentRef = await db("agent")
    .where((query) =>
      query
        .where("providerApiKeyId", providerApiKeyId)
        .orWhere("embeddingProviderApiKeyId", providerApiKeyId),
    )
    .first();
  if (agentRef) {
    return {
      success: false,
      error:
        "This API key is still in use by an agent. Remove the reference first.",
    };
  }

  const partnerRef = await db("organisation")
    .where("providerApiKeyId", providerApiKeyId)
    .andWhere("partner", true)
    .first();
  if (partnerRef) {
    return {
      success: false,
      error:
        "This API key is still in use by a partner. Remove the reference first.",
    };
  }

  await db("providerApiKey").where({ id: providerApiKeyId }).delete();

  return { success: true };
};

export default saDeleteProviderApiKey;
