"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { embed } from "ai";
import userCanViewAgent from "@/lib/userCanViewAgent";
import { addLog } from "@/lib/addLog";
import { getAdminAiEmbeddingModel } from "@/lib/adminAi";

const saRegenerateDocumentEmbeddings = async ({
  documentId,
}: {
  documentId: string;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  // Get the document and its associated agent's embedding configuration
  const document = await db("knowledgeDocument")
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
    .where("knowledgeDocument.id", documentId)
    .select(
      "knowledgeDocument.*",
      db.raw(
        '"embeddingProviderApiKey"."key" as "embeddingProviderApiKey"',
      ),
      "embeddingProvider.name as embeddingProviderName",
      "embeddingProvider.id as embeddingProviderId",
      "embeddingModel.model as embeddingModelName",
    )
    .first();

  if (!document) {
    return {
      success: false,
      error: "Document not found",
    };
  }

  // Verify the user can access this agent
  if (!(await userCanViewAgent({ agentId: document.agentId }))) {
    return { success: false, error: "Unauthorized" };
  }

  if (!document.embeddingProviderApiKey || !document.embeddingProviderName) {
    return {
      success: false,
      error: "Agent does not have an embedding provider API key configured",
    };
  }

  if (!document.embeddingModelName) {
    return {
      success: false,
      error: "Agent does not have an embedding model configured",
    };
  }

  // Get all knowledge blocks for this document
  const blocks = await db("knowledgeBlock")
    .where("documentId", documentId)
    .orderBy("blockIndex", "asc")
    .select("id", "content", "title");

  if (blocks.length === 0) {
    return {
      success: false,
      error: "No knowledge blocks found for this document",
    };
  }

  let successCount = 0;
  let errorCount = 0;

  // Regenerate embeddings for each block
  for (const block of blocks) {
    try {
      // Include document title and block title for better semantic context
      let embeddingText = block.content;
      if (document.title && block.title) {
        embeddingText = `${document.title}: ${block.title}\n\n${block.content}`;
      } else if (document.title) {
        embeddingText = `${document.title}\n\n${block.content}`;
      } else if (block.title) {
        embeddingText = `${block.title}\n\n${block.content}`;
      }

      const { embedding, usage } = await embed({
        model: getAdminAiEmbeddingModel({
          providerName: document.embeddingProviderName,
          apiKey: document.embeddingProviderApiKey,
          modelId: document.embeddingModelName,
        }),
        value: embeddingText,
      });

      const usageTokens = usage?.tokens;
      const tokenCount =
        typeof usageTokens === "number" && Number.isFinite(usageTokens)
          ? usageTokens
          : Math.ceil(embeddingText.length / 4);

      // Update the block with new embedding
      await db("knowledgeBlock")
        .where({ id: block.id })
        .update({
          tokenCount,
          embedding: `[${embedding.join(",")}]`,
          embeddingProviderId: document.embeddingProviderId,
          embeddingModel: document.embeddingModelName,
          embeddingDimensions: embedding.length,
        });

      successCount++;
    } catch (error) {
      console.error(
        `Error regenerating embedding for block ${block.id}:`,
        error,
      );
      errorCount++;
    }
  }

  // Log the regeneration
  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "Document Embeddings Regenerated",
    description: `Regenerated embeddings for document "${document.title}"`,
    agentId: document.agentId,
    data: {
      documentId,
      documentTitle: document.title,
      totalBlocks: blocks.length,
      successCount,
      errorCount,
    },
  });

  if (errorCount > 0 && successCount === 0) {
    return {
      success: false,
      error: `Failed to regenerate all ${errorCount} embeddings`,
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

export { saRegenerateDocumentEmbeddings };
