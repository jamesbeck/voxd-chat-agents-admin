"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";

type Message = {
  role: "user" | "assistant";
  content: string;
  annotation: string | null;
  time: number;
};

const saUpdateQuoteExampleConversation = async ({
  conversationId,
  messages,
  description,
  startTime,
}: {
  conversationId: string;
  messages: Message[];
  description?: string;
  startTime?: string;
}): Promise<ServerActionResponse> => {
  if (!conversationId) {
    return {
      success: false,
      error: "Conversation ID is required",
    };
  }

  if (!messages || messages.length === 0) {
    return {
      success: false,
      error: "Messages are required",
    };
  }

  const accessToken = await verifyAccessToken();

  // Get the conversation with quote and organisation data
  const conversation = await db("exampleConversation")
    .leftJoin("quote", "exampleConversation.quoteId", "quote.id")
    .leftJoin("organisation", "quote.organisationId", "organisation.id")
    .where("exampleConversation.id", conversationId)
    .select("exampleConversation.*", "organisation.partnerId")
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

  // Check if user is super admin or the partner that owns this quote
  const isSuperAdmin = accessToken.superAdmin;
  const isOwnerPartner =
    accessToken.partner && accessToken.partnerId === conversation.partnerId;

  if (!isSuperAdmin && !isOwnerPartner) {
    return {
      success: false,
      error: "You don't have permission to edit this conversation",
    };
  }

  // Update the conversation
  const updateData: Record<string, unknown> = {
    messages: JSON.stringify(messages),
    generationStatus: "completed",
    generationErrorSummary: null,
    generationErrorDetail: null,
  };

  if (description !== undefined) {
    updateData.description = description;
  }

  if (startTime !== undefined) {
    updateData.startTime = startTime;
  }

  await db("exampleConversation")
    .where({ id: conversationId })
    .update(updateData);

  return { success: true };
};

export default saUpdateQuoteExampleConversation;
