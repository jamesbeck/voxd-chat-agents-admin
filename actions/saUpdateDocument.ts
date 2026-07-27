"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import userCanViewAgent from "@/lib/userCanViewAgent";
import { addLog } from "@/lib/addLog";
import {
  normalizeKnowledgeDocumentPrompt,
  normalizeKnowledgeDocumentSourceInput,
} from "@/lib/knowledgeDocumentSource";

const saUpdateDocument = async ({
  documentId,
  title,
  description,
  prompt,
  sourceUrl,
  sourceType,
  enabled,
}: {
  documentId: string;
  title?: string;
  description?: string;
  prompt?: string;
  sourceUrl?: string;
  sourceType?: string;
  enabled?: boolean;
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

  if (!documentId) {
    return {
      success: false,
      error: "Document ID is required",
    };
  }

  const existingDocument = await db("knowledgeDocument")
    .select("*")
    .where({ id: documentId })
    .first();

  if (!existingDocument) {
    return {
      success: false,
      error: "Document not found",
    };
  }

  // Verify the user can access this agent
  if (!(await userCanViewAgent({ agentId: existingDocument.agentId }))) {
    return { success: false, error: "Unauthorized" };
  }

  await db("knowledgeDocument").where({ id: documentId }).update({
    title,
    description,
    prompt: normalizedPrompt.data,
    sourceUrl: normalizedSource.data.sourceUrl,
    sourceType: normalizedSource.data.sourceType,
    enabled,
    updatedAt: db.fn.now(),
  });

  // Log document update
  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "Document Updated",
    description: `Knowledge document "${
      title || existingDocument.title
    }" updated`,
    agentId: existingDocument.agentId,
    data: {
      documentId,
      before: {
        title: existingDocument.title,
        description: existingDocument.description,
        prompt: existingDocument.prompt,
        sourceUrl: existingDocument.sourceUrl,
        sourceType: existingDocument.sourceType,
        enabled: existingDocument.enabled,
      },
      after: {
        title,
        description,
        prompt: normalizedPrompt.data,
        sourceUrl: normalizedSource.data.sourceUrl,
        sourceType: normalizedSource.data.sourceType,
        enabled,
      },
    },
  });

  return { success: true };
};

export default saUpdateDocument;
