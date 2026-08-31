"use server";

import db from "../database/db";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { ServerActionResponse } from "@/types/types";

const saRegenerateExampleConversation = async ({
  conversationId,
}: {
  conversationId: string;
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
    .select(
      "exampleConversation.id",
      "exampleConversation.quoteId",
      "exampleConversation.generationStatus",
      "quote.archived",
      "organisation.partnerId",
    )
    .first();

  if (!conversation) return { success: false, error: "Conversation not found" };
  if (conversation.archived) {
    return { success: false, error: "Archived quotes cannot be edited" };
  }
  if (
    !accessToken.superAdmin &&
    (!accessToken.partner || accessToken.partnerId !== conversation.partnerId)
  ) {
    return { success: false, error: "Permission denied" };
  }
  if (conversation.generationStatus !== "error") {
    return {
      success: false,
      error: "Only errored conversations can be re-generated",
    };
  }

  await db("exampleConversation").where("id", conversationId).update({
    description: "Generating...",
    startTime: "--:--",
    messages: JSON.stringify([]),
    generationStatus: "pending",
    generationErrorSummary: null,
    generationErrorDetail: null,
  });

  return { success: true, data: { conversationId } };
};

export default saRegenerateExampleConversation;
