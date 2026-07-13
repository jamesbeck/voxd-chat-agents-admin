"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { z } from "zod";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { addLog } from "@/lib/addLog";

const cloneAgentSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
  name: z.string().min(1, "Name is required"),
  niceName: z.string().min(1, "Nice name is required"),
  organisationId: z.string().min(1, "Organisation is required"),
  phoneNumberId: z.string().optional().nullable(),
  providerApiKeyId: z.string().optional().nullable(),
});

const saCloneAgent = async (input: {
  agentId: string;
  name: string;
  niceName: string;
  organisationId: string;
  phoneNumberId?: string | null;
  providerApiKeyId?: string | null;
}): Promise<ServerActionResponse> => {
  const parsed = cloneAgentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed. Please check your inputs.",
    };
  }

  const {
    agentId,
    name,
    niceName,
    organisationId,
    phoneNumberId,
    providerApiKeyId,
  } = parsed.data;

  const accessToken = await verifyAccessToken();
  if (!accessToken.superAdmin) {
    return { success: false, error: "Permission denied" };
  }

  try {
    // Fetch source agent
    const sourceAgent = await db("agent").where("id", agentId).first();
    if (!sourceAgent) {
      return { success: false, error: "Source agent not found" };
    }

    // Check name uniqueness
    const existingAgent = await db("agent").where("name", name).first();
    if (existingAgent) {
      return {
        success: false,
        error: `An agent already exists with the name '${name}'`,
        fieldErrors: { name: `An agent already exists with this name` },
      };
    }

    // Determine provider API key
    const resolvedProviderApiKeyId =
      organisationId === sourceAgent.organisationId
        ? sourceAgent.providerApiKeyId
        : providerApiKeyId || null;
    const resolvedEmbeddingProviderApiKeyId =
      organisationId === sourceAgent.organisationId
        ? sourceAgent.embeddingProviderApiKeyId
        : null;

    // Use a transaction for the entire clone operation
    const newAgentId = await db.transaction(async (trx) => {
      // 1. Insert new agent
      const [newAgent] = await trx("agent")
        .insert({
          name,
          niceName,
          organisationId,
          phoneNumberId: phoneNumberId || null,
          providerApiKeyId: resolvedProviderApiKeyId,
          embeddingProviderApiKeyId: resolvedEmbeddingProviderApiKeyId,
          targetMessageLengthCharacters:
            sourceAgent.targetMessageLengthCharacters,
          maxMessageHistory: sourceAgent.maxMessageHistory,
          autoCloseSessionAfterSeconds:
            sourceAgent.autoCloseSessionAfterSeconds,
          modelId: sourceAgent.modelId,
          embeddingModelId: sourceAgent.embeddingModelId,
          config: sourceAgent.config
            ? JSON.stringify(sourceAgent.config)
            : null,
          codeDirectory: sourceAgent.codeDirectory,
        })
        .returning("*");

      // 2. Clone partial prompts
      const partialPrompts = await trx("partialPrompt")
        .where("agentId", agentId)
        .select("*");

      if (partialPrompts.length > 0) {
        await trx("partialPrompt").insert(
          partialPrompts.map((pp: any) => ({
            agentId: newAgent.id,
            name: pp.name,
            text: pp.text,
          })),
        );
      }

      // 3. Clone knowledge documents and blocks
      const knowledgeDocs = await trx("knowledgeDocument")
        .where("agentId", agentId)
        .select("*");

      for (const doc of knowledgeDocs) {
        const [newDoc] = await trx("knowledgeDocument")
          .insert({
            agentId: newAgent.id,
            title: doc.title,
            description: doc.description,
            sourceUrl: doc.sourceUrl,
            sourceType: doc.sourceType,
            metadata: doc.metadata ? JSON.stringify(doc.metadata) : null,
            enabled: doc.enabled,
          })
          .returning("*");

        // Clone knowledge blocks for this document
        const blocks = await trx("knowledgeBlock")
          .where("documentId", doc.id)
          .select("*");

        if (blocks.length > 0) {
          await trx("knowledgeBlock").insert(
            blocks.map((block: any) => ({
              documentId: newDoc.id,
              content: block.content,
              title: block.title,
              blockIndex: block.blockIndex,
              metadata: block.metadata ? JSON.stringify(block.metadata) : null,
              tokenCount: block.tokenCount,
              embedding: block.embedding,
              embeddingProviderId: block.embeddingProviderId,
              embeddingModel: block.embeddingModel,
              embeddingDimensions: block.embeddingDimensions,
            })),
          );
        }
      }

      return newAgent.id;
    });

    // Log the clone action
    await addLog({
      adminUserId: accessToken.adminUserId,
      agentId: newAgentId,
      event: "Agent Cloned",
      description: `Agent cloned from '${sourceAgent.name}' to '${name}'`,
      data: {
        sourceAgentId: agentId,
        sourceAgentName: sourceAgent.name,
        newAgentName: name,
      },
    });

    return { success: true, data: { id: newAgentId } };
  } catch (error: any) {
    console.error("Error cloning agent:", error);
    return {
      success: false,
      error: error?.message || "Failed to clone agent",
    };
  }
};

export default saCloneAgent;
