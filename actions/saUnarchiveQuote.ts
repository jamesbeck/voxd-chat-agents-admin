"use server";

import db from "../database/db";
import { verifyAccessToken } from "@/lib/auth/verifyToken";

type UnarchiveQuoteParams = {
  quoteId: string;
};

type UnarchiveQuoteResponse = {
  success: boolean;
  error?: string;
};

export default async function saUnarchiveQuote(
  params: UnarchiveQuoteParams,
): Promise<UnarchiveQuoteResponse> {
  const { quoteId } = params;

  const accessToken = await verifyAccessToken();
  if (!accessToken) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const quote = await db("quote")
      .where({ "quote.id": quoteId })
      .leftJoin("organisation", "quote.organisationId", "organisation.id")
      .select("quote.id", "quote.archived", "organisation.partnerId")
      .first();

    if (!quote) {
      return {
        success: false,
        error: "Quote not found",
      };
    }

    const isSuperAdmin = accessToken.superAdmin;
    const isOwnerPartner =
      accessToken.partner &&
      accessToken.partnerId &&
      quote.partnerId === accessToken.partnerId;

    if (!isSuperAdmin && !isOwnerPartner) {
      return {
        success: false,
        error: "You do not have permission to unarchive this quote",
      };
    }

    if (!quote.archived) {
      return {
        success: false,
        error: "Quote is not archived",
      };
    }

    await db("quote").where({ id: quoteId }).update({ archived: false });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error unarchiving quote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
