"use server";

import { embed } from "ai";
import db from "../database/db";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import userCanViewAgent from "@/lib/userCanViewAgent";
import getAgentById from "@/lib/getAgentById";
import { getAdminAiEmbeddingModel } from "@/lib/adminAi";

export type KnowledgeBlockSearchResult = {
  blockId: string;
  documentId: string;
  documentTitle: string;
  documentDescription: string | null;
  documentEnabled: boolean;
  content: string;
  title: string | null;
  similarity: number;
  blockIndex: number;
};

const saSearchKnowledgeByEmbedding = async ({
  agentId,
  query,
  similarityThreshold = 0.3,
}: {
  agentId: string;
  query: string;
  similarityThreshold?: number;
}): Promise<{
  success: boolean;
  data?: KnowledgeBlockSearchResult[];
  error?: string;
}> => {
  try {
    await verifyAccessToken();

    // Verify user can view this agent
    if (!(await userCanViewAgent({ agentId }))) {
      return { success: false, error: "Unauthorized" };
    }

    // Get agent to retrieve API key
    const agent = await getAgentById({ agentId });
    if (
      !agent ||
      !agent.embeddingProviderApiKey ||
      !agent.embeddingProviderApiKeyProviderName ||
      !agent.embeddingModelName
    ) {
      return { success: false, error: "Agent not found or missing API key" };
    }

    // Generate embedding for the query
    const { embedding } = await embed({
      model: getAdminAiEmbeddingModel({
        providerName: agent.embeddingProviderApiKeyProviderName,
        apiKey: agent.embeddingProviderApiKey,
        modelId: agent.embeddingModelName,
      }),
      value: query,
    });

    // Convert embedding array to pgvector format
    const embeddingString = `[${embedding.join(",")}]`;
    const queryEmbeddingModel = agent.embeddingModelName;
    const queryEmbeddingDimensions = embedding.length;

    // Query the knowledge base using cosine similarity
    const results = await db.raw(
      `
      SELECT 
        kb.id as "blockId",
        kb."documentId",
        kd.title as "documentTitle",
        kd.description as "documentDescription",
        kd.enabled as "documentEnabled",
        kb.content,
        kb.title,
        kb."blockIndex",
        1 - (kb.embedding <=> ?::vector) as similarity
      FROM "knowledgeBlock" kb
      JOIN "knowledgeDocument" kd ON kb."documentId" = kd.id
      WHERE kd."agentId" = ?
        AND kb.embedding IS NOT NULL
        AND kb."embeddingModel" = ?
        AND kb."embeddingDimensions" = ?
        AND 1 - (kb.embedding <=> ?::vector) >= ?
      ORDER BY kb.embedding <=> ?::vector
      LIMIT 100
    `,
      [
        embeddingString,
        agentId,
        queryEmbeddingModel,
        queryEmbeddingDimensions,
        embeddingString,
        similarityThreshold,
        embeddingString,
      ],
    );

    // Map results to block array (already sorted by similarity from SQL)
    const blocks: KnowledgeBlockSearchResult[] = results.rows.map(
      (row: any) => ({
        blockId: row.blockId,
        documentId: row.documentId,
        documentTitle: row.documentTitle,
        documentDescription: row.documentDescription,
        documentEnabled: row.documentEnabled,
        content: row.content,
        title: row.title,
        similarity: parseFloat(row.similarity),
        blockIndex: row.blockIndex,
      }),
    );

    return {
      success: true,
      data: blocks,
    };
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to search knowledge",
    };
  }
};

export default saSearchKnowledgeByEmbedding;
