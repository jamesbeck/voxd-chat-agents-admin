import db from "../database/db";

const getAgentById = async ({ agentId }: { agentId: string }) => {
  const agent = await db("agent")
    .leftJoin("model", "agent.modelId", "model.id")
    .leftJoin("provider", "model.providerId", "provider.id")
    .leftJoin(
      "model as embeddingModel",
      "agent.embeddingModelId",
      "embeddingModel.id",
    )
    .leftJoin("phoneNumber", "agent.phoneNumberId", "phoneNumber.id")
    .leftJoin("organisation", "agent.organisationId", "organisation.id")
    .leftJoin(
      "organisation as directPartnerOrganisation",
      "organisation.partnerId",
      "directPartnerOrganisation.id",
    )
    .leftJoin(
      "organisation as parentPartnerOrganisation",
      "directPartnerOrganisation.partnerId",
      "parentPartnerOrganisation.id",
    )
    .leftJoin("providerApiKey", "agent.providerApiKeyId", "providerApiKey.id")
    .leftJoin(
      "provider as keyProvider",
      "providerApiKey.providerId",
      "keyProvider.id",
    )
    .leftJoin(
      "organisation as keyOrganisation",
      "providerApiKey.organisationId",
      "keyOrganisation.id",
    )
    .leftJoin(
      "providerApiKey as embeddingProviderApiKey",
      "agent.embeddingProviderApiKeyId",
      "embeddingProviderApiKey.id",
    )
    .leftJoin(
      "provider as embeddingKeyProvider",
      "embeddingProviderApiKey.providerId",
      "embeddingKeyProvider.id",
    )
    .where("agent.id", agentId)
    .select(
      "agent.*",
      "model.model",
      "embeddingModel.model as embeddingModelName",
      "provider.name as provider",
      "keyProvider.name as providerApiKeyProviderName",
      "embeddingKeyProvider.name as embeddingProviderApiKeyProviderName",
      "model.inputTokenCost",
      "model.outputTokenCost",
      "phoneNumber.displayPhoneNumber",
      "phoneNumber.displayPhoneNumber as phoneNumber",
      "organisation.name as organisationName",
      "organisation.partnerId as directPartnerId",
      "directPartnerOrganisation.name as directPartnerName",
      "directPartnerOrganisation.partnerId as parentPartnerId",
      "parentPartnerOrganisation.name as parentPartnerName",
      db.raw('"providerApiKey"."key" as "providerApiKey"'),
      db.raw(
        '"embeddingProviderApiKey"."key" as "embeddingProviderApiKey"',
      ),
      db.raw(
        `CASE WHEN "providerApiKey"."id" IS NOT NULL THEN "keyProvider"."name" || ' — ' || LEFT("providerApiKey"."key", 6) || '...' || RIGHT("providerApiKey"."key", 4) || COALESCE(' (' || "keyOrganisation"."name" || ')', '') ELSE NULL END as "providerApiKeyLabel"`,
      ),
    )
    .first();
  return agent;
};

export default getAgentById;
