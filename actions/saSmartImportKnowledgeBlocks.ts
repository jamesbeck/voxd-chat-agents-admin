"use server";

import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { addLog } from "@/lib/addLog";
import {
  getKnowledgeDocumentImportContext,
  importKnowledgeBlocksFromText,
} from "@/lib/knowledgeDocumentImport";
import { knowledgeDocumentBlocksAreEditable } from "@/lib/knowledgeDocumentSource";

const saSmartImportKnowledgeBlocks = async ({
  documentId,
  text,
}: {
  documentId: string;
  text: string;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();
  let documentContext: Awaited<
    ReturnType<typeof getKnowledgeDocumentImportContext>
  > | null = null;
  let importResult: Awaited<
    ReturnType<typeof importKnowledgeBlocksFromText>
  > | null = null;

  try {
    documentContext = await getKnowledgeDocumentImportContext({ documentId });

    if (!knowledgeDocumentBlocksAreEditable(documentContext.sourceType)) {
      return {
        success: false,
        error:
          "URL-backed documents can only be updated by refreshing the source URL",
      };
    }

    importResult = await importKnowledgeBlocksFromText({
      documentId,
      text,
      providerApiKey: documentContext.providerApiKey,
      modelName: documentContext.modelName,
      documentPrompt: documentContext.prompt,
    });
  } catch (error) {
    console.error("Error importing knowledge blocks:", error);
    return {
      success: false,
      error: `Failed to import knowledge blocks: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }

  // Log Smart AI Import usage
  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "Smart AI Import",
    description: `Smart AI Import created ${importResult.blocksCreated} knowledge blocks`,
    agentId: documentContext.agentId,
    data: {
      documentId,
      inputText: text,
      blocksCreated: importResult.blocksCreated,
      generatedBlocks: importResult.generatedBlocks,
    },
  });

  return {
    success: true,
    data: { blocksCreated: importResult.blocksCreated },
  };
};

export default saSmartImportKnowledgeBlocks;
