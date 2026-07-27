"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { addLog } from "@/lib/addLog";
import {
  normalizeKnowledgeDocumentPrompt,
  normalizeKnowledgeDocumentSourceInput,
} from "@/lib/knowledgeDocumentSource";
import { refreshKnowledgeDocumentFromUrl } from "@/lib/knowledgeDocumentImport";

const saCreateDocument = async ({
  agentId,
  title,
  description,
  prompt,
  sourceUrl,
  sourceType,
}: {
  agentId: string;
  title: string;
  description?: string;
  prompt?: string;
  sourceUrl?: string;
  sourceType?: string;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();
  const normalizedSource = normalizeKnowledgeDocumentSourceInput({
    sourceType,
    sourceUrl,
  });
  const normalizedPrompt = normalizeKnowledgeDocumentPrompt(prompt);

  if (!normalizedSource.success) {
    return normalizedSource;
  }

  if (!normalizedPrompt.success) {
    return normalizedPrompt;
  }

  // Check the agent exists
  const agent = await db("agent").where("id", agentId).first();
  if (!agent) {
    return {
      success: false,
      error: "Agent not found",
    };
  }

  try {
    const { newDocument, importedBlocks } = await db.transaction(
      async (trx) => {
        const [createdDocument] = await trx("knowledgeDocument")
          .insert({
            agentId,
            title,
            description,
            prompt: normalizedPrompt.data,
            sourceUrl: normalizedSource.data.sourceUrl,
            sourceType: normalizedSource.data.sourceType,
            enabled: true,
          })
          .returning("*");

        let importedBlockCount: number | null = null;

        if (normalizedSource.data.sourceType === "url") {
          const refreshResult = await refreshKnowledgeDocumentFromUrl({
            documentId: createdDocument.id,
            trx,
          });
          importedBlockCount = refreshResult.blocksCreated;
        }

        return {
          newDocument: createdDocument,
          importedBlocks: importedBlockCount,
        };
      },
    );

    // Log document creation
    await addLog({
      adminUserId: accessToken.adminUserId,
      event: "Document Created",
      description: `Knowledge document "${title}" created`,
      agentId,
      data: {
        documentId: newDocument.id,
        title,
        description,
        prompt: normalizedPrompt.data,
        sourceUrl: normalizedSource.data.sourceUrl,
        sourceType: normalizedSource.data.sourceType,
        importedBlocks,
      },
    });

    return {
      success: true,
      data: newDocument,
    };
  } catch (error) {
    console.error("Error creating document:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error creating document",
    };
  }
};

export { saCreateDocument };
