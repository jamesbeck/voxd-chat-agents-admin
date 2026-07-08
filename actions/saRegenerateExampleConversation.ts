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
    return {
      success: false,
      error: "Conversation ID is required",
    };
  }

  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin && !accessToken.partner) {
    return {
      success: false,
      error:
        "Only partners and super admins can regenerate example conversations",
    };
  }

  const conversation = await db("exampleConversation")
    .leftJoin("example", "example.id", "exampleConversation.exampleId")
    .leftJoin("quote", "exampleConversation.quoteId", "quote.id")
    .leftJoin("organisation", "quote.organisationId", "organisation.id")
    .where("exampleConversation.id", conversationId)
    .select(
      "exampleConversation.id",
      "exampleConversation.exampleId",
      "exampleConversation.quoteId",
      "exampleConversation.generationStatus",
      "example.organisationId as examplePartnerId",
      "organisation.partnerId as quotePartnerId",
    )
    .first();

  if (!conversation) {
    return {
      success: false,
      error: "Conversation not found",
    };
  }

  if (conversation.archived) {
    return {
      success: false,
      error: "Archived quotes cannot be edited",
    };
  }

  const ownerPartnerId =
    conversation.examplePartnerId || conversation.quotePartnerId;
  const isSuperAdmin = accessToken.superAdmin;
  const isOwnerPartner =
    accessToken.partner && accessToken.partnerId === ownerPartnerId;

  if (!isSuperAdmin && !isOwnerPartner) {
    return {
      success: false,
      error: "You don't have permission to regenerate this conversation",
    };
  }

  if (conversation.generationStatus !== "error") {
    return {
      success: false,
      error: "Only errored conversations can be re-generated",
    };
  }

  await db("exampleConversation")
    .where("id", conversationId)
    .update({
      description: "Generating...",
      startTime: "--:--",
      messages: JSON.stringify([]),
      generationStatus: "pending",
      generationErrorSummary: null,
      generationErrorDetail: null,
    });

  return {
    success: true,
    data: { conversationId },
  };
};

export default saRegenerateExampleConversation;
