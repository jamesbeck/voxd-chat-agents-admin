"use server";

import db from "../database/db";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { ServerActionResponse } from "@/types/types";

const saMarkExampleConversationGenerationError = async ({
  conversationId,
  summary,
  detail,
}: {
  conversationId: string;
  summary: string;
  detail?: string;
}): Promise<ServerActionResponse> => {
  if (!conversationId) {
    return { success: false, error: "Conversation ID is required" };
  }

  const accessToken = await verifyAccessToken();
  if (!accessToken.superAdmin && !accessToken.partner) {
    return { success: false, error: "Permission denied" };
  }

  const conversation = await db("exampleConversation")
    .leftJoin("quote", "exampleConversation.quoteId", "quote.id")
    .leftJoin("organisation", "quote.organisationId", "organisation.id")
    .where("exampleConversation.id", conversationId)
    .select("exampleConversation.id", "organisation.partnerId")
    .first();

  if (!conversation) return { success: false, error: "Conversation not found" };
  if (
    !accessToken.superAdmin &&
    (!accessToken.partner || accessToken.partnerId !== conversation.partnerId)
  ) {
    return { success: false, error: "Permission denied" };
  }

  await db("exampleConversation").where("id", conversationId).update({
    generationStatus: "error",
    generationErrorSummary: summary,
    generationErrorDetail: detail || summary,
  });

  return { success: true };
};

export default saMarkExampleConversationGenerationError;
