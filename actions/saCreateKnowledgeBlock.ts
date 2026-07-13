"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { embed } from "ai";
import { addLog } from "@/lib/addLog";
import { knowledgeDocumentBlocksAreEditable } from "@/lib/knowledgeDocumentSource";
import { getAdminAiEmbeddingModel } from "@/lib/adminAi";

const saCreateKnowledgeBlock = async ({
  documentId,
  content,
  title,
}: {
  documentId: string;
  content: string;
  title?: string;
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

  if (!knowledgeDocumentBlocksAreEditable(document.sourceType)) {
    return {
      success: false,
      error:
        "URL-backed documents can only be updated by refreshing the source URL",
    };
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

  // Get the next block index
  const lastBlock = await db("knowledgeBlock")
    .where("documentId", documentId)
    .orderBy("blockIndex", "desc")
    .first();

  const blockIndex = lastBlock ? lastBlock.blockIndex + 1 : 0;

  // Generate the embedding with the agent's embedding-specific API key
  // Include document title and block title for better semantic context
  let embeddingText = content;
  if (document.title && title) {
    embeddingText = `${document.title}: ${title}\n\n${content}`;
  } else if (document.title) {
    embeddingText = `${document.title}\n\n${content}`;
  } else if (title) {
    embeddingText = `${title}\n\n${content}`;
  }

  let embeddingVector: number[] | null = null;
  let tokenCount: number | null = null;
  try {
    const { embedding, usage } = await embed({
      model: getAdminAiEmbeddingModel({
        providerName: document.embeddingProviderName,
        apiKey: document.embeddingProviderApiKey,
        modelId: document.embeddingModelName,
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

  // Create the knowledge block with embedding
  const embeddingModel = document.embeddingModelName;
  const [newBlock] = await db("knowledgeBlock")
    .insert({
      documentId,
      content,
      title,
      blockIndex,
      tokenCount,
      embedding: embeddingVector ? `[${embeddingVector.join(",")}]` : null,
      embeddingProviderId: document.embeddingProviderId,
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

  // Log knowledge block creation
  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "Knowledge Block Created",
    description: `Knowledge block "${title || "Untitled"}" created`,
    agentId: document.agentId,
    data: {
      blockId: newBlock.id,
      documentId,
      title,
      content,
      blockIndex,
      tokenCount,
    },
  });

  return {
    success: true,
    data: newBlock,
  };
};

export { saCreateKnowledgeBlock };
