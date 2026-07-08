"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { z, treeifyError } from "zod";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { createQuoteOgWithLogo } from "@/lib/createQuoteOgWithLogo";

// Validation schema for creating a quote
const createQuoteSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  organisationId: z.string().trim().min(1, "Organisation ID is required"),
});

const saCreateQuote = async (input: {
  title: string;
  organisationId: string;
}): Promise<ServerActionResponse> => {
  const parsed = createQuoteSchema.safeParse(input);
  if (!parsed.success) {
    console.log("Validation errors:", treeifyError(parsed.error));

    return {
      success: false,
      error: "aaahhhh", //treeifyError(parsed.error),
    };
  }

  const { title, organisationId } = parsed.data;

  // Generate a random 6-character short link ID (capital letters and numbers only)
  const generateShortLinkId = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const shortLinkId = generateShortLinkId();

  // Get logged-in user to set as owner
  const accessToken = await verifyAccessToken();

  // Get the organisation with partner info
  const organisation = await db("organisation")
    .where("organisation.id", organisationId)
    .select(
      "organisation.about",
      "organisation.logoFileExtension",
      db.raw('organisation."showLogoOnColour"'),
      "organisation.hourlyRate",
    )
    .first();

  // Insert new quote (include organisationId if column exists; adjust as needed)
  try {
    const [newQuote] = await db("quote")
      .insert({
        title,
        organisationId,
        createdByAdminUserId: accessToken.adminUserId,
        background: organisation?.about || null,
        shortLinkId,
        hourlyRateVoxdCost: organisation?.hourlyRate ?? null,
      })
      .returning("id");

    // Generate OG image for the new quote (uses fallback chain: org logo)
    createQuoteOgWithLogo({
      quoteId: newQuote.id,
      heroImageBuffer: null,
      organisationId,
      organisationLogoFileExtension: organisation?.logoFileExtension || null,
      organisationShowLogoOnColour: organisation?.showLogoOnColour || null,
    }).catch((err) => {
      console.error("Failed to generate OG image for new quote:", err);
    });

    return { success: true, data: newQuote };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to create quote",
    };
  }
};

export { saCreateQuote };
