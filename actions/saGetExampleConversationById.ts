"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";

const saGetExampleConversationById = async ({
  conversationId,
}: {
  conversationId: string;
}): Promise<ServerActionResponse> => {
  if (!conversationId) {
    return { success: false, error: "Conversation ID is required" };
  }

  const conversation = await db("exampleConversation")
    .leftJoin("quote", "quote.id", "exampleConversation.quoteId")
    .leftJoin("organisation", "organisation.id", "quote.organisationId")
    .where("exampleConversation.id", conversationId)
    .select(
      "exampleConversation.id",
      "exampleConversation.description",
      "exampleConversation.startTime",
      "exampleConversation.messages",
      "exampleConversation.quoteId",
      "organisation.id as organizationId",
      "organisation.name as organizationName",
      "organisation.logoFileExtension as organizationLogoFileExtension",
      db.raw(
        'organisation."showLogoOnColour" as "organizationShowLogoOnColour"',
      ),
    )
    .first();

  if (!conversation) return { success: false, error: "Conversation not found" };
  return { success: true, data: conversation };
};

export default saGetExampleConversationById;
