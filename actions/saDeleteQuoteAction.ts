"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";

const saDeleteQuoteAction = async ({
  actionId,
}: {
  actionId: string;
}): Promise<ServerActionResponse> => {
  if (!actionId) {
    return {
      success: false,
      error: "Action ID is required",
    };
  }

  try {
    const existingAction = await db("quoteAction")
      .leftJoin("quote", "quoteAction.quoteId", "quote.id")
      .select("quote.archived")
      .where("quoteAction.id", actionId)
      .first();

    if (!existingAction) {
      return {
        success: false,
        error: "Action not found",
      };
    }

    if (existingAction.archived) {
      return {
        success: false,
        error: "Action history cannot be edited while the quote is archived",
      };
    }

    await db("quoteAction").where({ id: actionId }).delete();
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to delete action",
    };
  }
};

export default saDeleteQuoteAction;
