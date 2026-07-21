"use server";

import { embed } from "ai";
import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import { getAdminAiEmbeddingModel } from "@/lib/adminAi";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import userCanViewAgent from "@/lib/userCanViewAgent";
import { ServerActionResponse } from "@/types/types";

const saRegenerateAffectedEmbeddings = async ({
  agentId,
}: {
  agentId: string;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  if (!(await userCanViewAgent({ agentId, accessToken }))) {
    return { success: false, error: "Unauthorized" };
  }

  const agent = await db("agent")
    .leftJoin(
      "model as embeddingModel",
      "agent.embeddingModelId",
      "embeddingModel.id",
    )
    .leftJoin(
      "providerApiKey as embeddingProviderApiKey",
      "agent.embeddingProviderApiKeyId",
      "embeddingProviderApiKey.id",
    )
    .leftJoin(
      "provider as embeddingProvider",
      "embeddingProviderApiKey.providerId",
      "embeddingProvider.id",
    )
    .where("agent.id", agentId)
    .select(
      db.raw(
        '"embeddingProviderApiKey"."key" as "embeddingProviderApiKey"',
      ),
      "embeddingProvider.name as embeddingProviderName",
      "embeddingProvider.id as embeddingProviderId",
      "embeddingModel.model as embeddingModelName",
    )
    .first();

  if (!agent) {
    return { success: false, error: "Agent not found" };
  }

  if (!agent.embeddingProviderApiKey || !agent.embeddingProviderName) {
    return {
      success: false,
      error: "Agent does not have an embedding provider API key configured",
    };
  }

  if (!agent.embeddingModelName) {
    return {
      success: false,
      error: "Agent does not have an embedding model configured",
    };
  }

  const blocks = await db("knowledgeBlock")
    .join(
      "knowledgeDocument",
      "knowledgeBlock.documentId",
      "knowledgeDocument.id",
    )
    .where("knowledgeDocument.agentId", agentId)
    .whereNotNull("knowledgeBlock.embedding")
    .where(function () {
      this.where(
        "knowledgeBlock.embeddingModel",
        "!=",
        agent.embeddingModelName,
      ).orWhereNull("knowledgeBlock.embeddingModel");
    })
    .orderBy("knowledgeBlock.documentId", "asc")
    .orderBy("knowledgeBlock.blockIndex", "asc")
    .select(
      "knowledgeBlock.id",
      "knowledgeBlock.content",
      "knowledgeBlock.title as blockTitle",
      "knowledgeDocument.title as documentTitle",
    );

  let successCount = 0;
  let errorCount = 0;

  for (const block of blocks) {
    try {
      let embeddingText = block.content;
      if (block.documentTitle && block.blockTitle) {
        embeddingText = `${block.documentTitle}: ${block.blockTitle}\n\n${block.content}`;
      } else if (block.documentTitle) {
        embeddingText = `${block.documentTitle}\n\n${block.content}`;
      } else if (block.blockTitle) {
        embeddingText = `${block.blockTitle}\n\n${block.content}`;
      }

      const { embedding, usage } = await embed({
        model: getAdminAiEmbeddingModel({
          providerName: agent.embeddingProviderName,
          apiKey: agent.embeddingProviderApiKey,
          modelId: agent.embeddingModelName,
        }),
        value: embeddingText,
      });

      const usageTokens = usage?.tokens;
      const tokenCount =
        typeof usageTokens === "number" && Number.isFinite(usageTokens)
          ? usageTokens
          : Math.ceil(embeddingText.length / 4);

      await db("knowledgeBlock").where({ id: block.id }).update({
        tokenCount,
        embedding: `[${embedding.join(",")}]`,
        embeddingProviderId: agent.embeddingProviderId,
        embeddingModel: agent.embeddingModelName,
        embeddingDimensions: embedding.length,
      });

      successCount++;
    } catch (error) {
      console.error(
        `Error regenerating incompatible embedding for block ${block.id}:`,
        error,
      );
      errorCount++;
    }
  }

  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "Incompatible Agent Embeddings Regenerated",
    description: `Regenerated incompatible embeddings for agent ${agentId}`,
    agentId,
    data: {
      embeddingModel: agent.embeddingModelName,
      totalBlocks: blocks.length,
      successCount,
      errorCount,
    },
  });

  if (errorCount > 0 && successCount === 0) {
    return {
      success: false,
      error: `Failed to regenerate all ${errorCount} affected embeddings`,
    };
  }

  return {
    success: true,
    data: {
      totalBlocks: blocks.length,
      successCount,
      errorCount,
    },
  };
};

export { saRegenerateAffectedEmbeddings };
