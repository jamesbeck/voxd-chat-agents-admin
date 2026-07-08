"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";

const saCreateQuoteAction = async ({
  quoteId,
  action,
}: {
  quoteId: string;
  action: string;
}): Promise<ServerActionResponse> => {
  if (!quoteId) {
    return {
      success: false,
      error: "Quote ID is required",
    };
  }

  if (!action || action.trim() === "") {
    return {
      success: false,
      error: "Action is required",
    };
  }

  // Get logged-in user
  const accessToken = await verifyAccessToken();

  if (!accessToken.adminUserId) {
    return {
      success: false,
      error: "You must be logged in to add an action",
    };
  }

  const quote = await db("quote")
    .select("archived")
    .where({ id: quoteId })
    .first();

  if (!quote) {
    return {
      success: false,
      error: "Quote not found",
    };
  }

  if (quote.archived) {
    return {
      success: false,
      error: "Action history cannot be edited while the quote is archived",
    };
  }

  try {
    const [newAction] = await db("quoteAction")
      .insert({
        quoteId,
        adminUserId: accessToken.adminUserId,
        action: action.trim(),
      })
      .returning("id");

    return { success: true, data: newAction };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to create action",
    };
  }
};

export default saCreateQuoteAction;
