"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { addLog } from "@/lib/addLog";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";

// Helper to strip protocol from URL
const stripProtocol = (url: string): string => {
  return url.replace(/^(https?:\/\/)/i, "");
};

const saUpdateOrganisation = async ({
  organisationId,
  name,
  webAddress,
  partner,
  showLogoOnColour,
  primaryColour,
}: {
  organisationId: string;
  name?: string;
  webAddress?: string;
  partner?: boolean;
  showLogoOnColour?: string | null;
  primaryColour?: string | null;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  // Only super admin users or users with a partnerId can edit organisations
  if (!accessToken.superAdmin && !accessToken.partnerId) {
    return {
      success: false,
      error: "You do not have permission to edit organisations",
    };
  }

  if (!organisationId) {
    return {
      success: false,
      error: "Organisation ID is required",
    };
  }

  //find the existing organisation
  const existingOrganisation = await db("organisation")
    .select("*")
    .where({ id: organisationId })
    .first();

  if (!existingOrganisation) {
    return {
      success: false,
      error: "Organisation not found",
    };
  }

  // Build update object
  const updateData: Record<string, any> = {};

  if (name !== undefined) {
    updateData.name = name;
    updateData.partnerId = accessToken.partnerId || null;
    updateData.webAddress = webAddress ? stripProtocol(webAddress) : null;
  }

  if (partner !== undefined) {
    updateData.partner = partner;
  }

  if (showLogoOnColour !== undefined) {
    updateData.showLogoOnColour = showLogoOnColour;
  }

  if (primaryColour !== undefined) {
    updateData.primaryColour = primaryColour;
  }

  //update the organisation
  await db("organisation").where({ id: organisationId }).update(updateData);

  if (
    showLogoOnColour !== undefined ||
    primaryColour !== undefined ||
    partner !== undefined
  ) {
    revalidateTag("partners", { expire: 0 });
    const cookieStore = await cookies();
    cookieStore.set("partner-branding-version", Date.now().toString(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // Log organisation update
  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "Organisation Updated",
    description: `Organisation "${name || existingOrganisation.name}" updated`,
    organisationId,
    partnerId: accessToken.partnerId,
    data: updateData,
  });

  return { success: true };
};

export { saUpdateOrganisation };
