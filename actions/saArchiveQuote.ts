"use server";

import db from "../database/db";
import { verifyAccessToken } from "@/lib/auth/verifyToken";

type ArchiveQuoteParams = {
  quoteId: string;
};

type ArchiveQuoteResponse = {
  success: boolean;
  error?: string;
};

export default async function saArchiveQuote(
  params: ArchiveQuoteParams,
): Promise<ArchiveQuoteResponse> {
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
        error: "You do not have permission to archive this quote",
      };
    }

    if (quote.archived) {
      return {
        success: false,
        error: "Quote is already archived",
      };
    }

    await db("quote").where({ id: quoteId }).update({ archived: true });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error archiving quote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
