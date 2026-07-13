"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { embed } from "ai";
import userCanViewAgent from "@/lib/userCanViewAgent";
import { addLog } from "@/lib/addLog";
import { knowledgeDocumentBlocksAreEditable } from "@/lib/knowledgeDocumentSource";
import { getAdminAiEmbeddingModel } from "@/lib/adminAi";

const saUpdateKnowledgeBlock = async ({
  blockId,
  content,
  title,
}: {
  blockId: string;
  content: string;
  title?: string;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  // Get the existing block with document and agent info
  const block = await db("knowledgeBlock")
    .join(
      "knowledgeDocument",
      "knowledgeBlock.documentId",
      "knowledgeDocument.id",
    )
    .join("agent", "knowledgeDocument.agentId", "agent.id")
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
    .where("knowledgeBlock.id", blockId)
    .select(
      "knowledgeBlock.*",
      "knowledgeDocument.agentId",
      "knowledgeDocument.title as documentTitle",
      "knowledgeDocument.sourceType",
      db.raw(
        '"embeddingProviderApiKey"."key" as "embeddingProviderApiKey"',
      ),
      "embeddingProvider.name as embeddingProviderName",
      "embeddingProvider.id as embeddingProviderId",
      "embeddingModel.model as embeddingModelName",
    )
    .first();

  if (!block) {
    return {
      success: false,
      error: "Knowledge block not found",
    };
  }

  // Verify the user can access this agent
  if (!(await userCanViewAgent({ agentId: block.agentId }))) {
    return { success: false, error: "Unauthorized" };
  }

  if (!knowledgeDocumentBlocksAreEditable(block.sourceType)) {
    return {
      success: false,
      error:
        "URL-backed documents can only be updated by refreshing the source URL",
    };
  }

  if (!block.embeddingProviderApiKey || !block.embeddingProviderName) {
    return {
      success: false,
      error: "Agent does not have an embedding provider API key configured",
    };
  }

  if (!block.embeddingModelName) {
    return {
      success: false,
      error: "Agent does not have an embedding model configured",
    };
  }

  // Generate the new embedding with the embedding-specific API key
  // Include document title and block title for better semantic context
  let embeddingText = content;
  if (block.documentTitle && title) {
    embeddingText = `${block.documentTitle}: ${title}\n\n${content}`;
  } else if (block.documentTitle) {
    embeddingText = `${block.documentTitle}\n\n${content}`;
  } else if (title) {
    embeddingText = `${title}\n\n${content}`;
  }

  let embeddingVector: number[] | null = null;
  let tokenCount: number | null = null;
  try {
    const { embedding, usage } = await embed({
      model: getAdminAiEmbeddingModel({
        providerName: block.embeddingProviderName,
        apiKey: block.embeddingProviderApiKey,
        modelId: block.embeddingModelName,
      }),
      value: embeddingText,
    });
    embeddingVector = embedding;
    const usageTokens = usage?.tokens;
    tokenCount =
      typeof usageTokens === "number" && Number.isFinite(usageTokens)
        ? usageTokens
        : Math.ceil(embeddingText.length / 4);
  } catch (error) {
    console.error("Error generating embedding:", error);
    return {
      success: false,
      error: `Failed to generate embedding: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }

  // Update the block with new content and embedding
  const embeddingModel = block.embeddingModelName;
  const [updatedBlock] = await db("knowledgeBlock")
    .where({ id: blockId })
    .update({
      content,
      title,
      tokenCount,
      embedding: embeddingVector ? `[${embeddingVector.join(",")}]` : null,
      embeddingProviderId: block.embeddingProviderId,
      embeddingModel,
      embeddingDimensions: embeddingVector ? embeddingVector.length : 0,
    })
    .returning([
      "id",
      "content",
      "title",
      "blockIndex",
      "tokenCount",
      "createdAt",
    ]);

  // Log knowledge block update
  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "Knowledge Block Updated",
    description: `Knowledge block "${title || "Untitled"}" updated`,
    agentId: block.agentId,
    data: {
      blockId,
      before: {
        title: block.title,
        content: block.content,
        tokenCount: block.tokenCount,
      },
      after: {
        title,
        content,
        tokenCount,
      },
    },
  });

  return {
    success: true,
    data: updatedBlock,
  };
};

export { saUpdateKnowledgeBlock };
