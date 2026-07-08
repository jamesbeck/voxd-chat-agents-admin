"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { hasAdminUserPermission } from "@/lib/adminUserPermissions";
import { getEffectivePartnerBranding } from "@/lib/getEffectivePartnerBranding";

const saUpdateQuotePricing = async ({
  quoteId,
  setupFee,
  monthlyFee,
  hourlyRate,
  contractNotes,
  setupFeeVoxdCost,
  monthlyFeeVoxdCost,
  buildDays,
  freeMonthlyMinutes,
  contractLength,
}: {
  quoteId: string;
  setupFee?: number | null;
  monthlyFee?: number | null;
  hourlyRate?: number | null;
  contractNotes?: string | null;
  setupFeeVoxdCost?: number | null;
  monthlyFeeVoxdCost?: number | null;
  buildDays?: number | null;
  freeMonthlyMinutes?: number | null;
  contractLength?: number | null;
}): Promise<ServerActionResponse> => {
  if (!quoteId) {
    return {
      success: false,
      error: "Quote ID is required",
    };
  }

  const accessToken = await verifyAccessToken();

  // Find the existing quote with organisation data
  const existingQuote = await db("quote")
    .leftJoin("organisation", "quote.organisationId", "organisation.id")
    .leftJoin(
      "organisation as partnerOrganisation",
      "organisation.partnerId",
      "partnerOrganisation.id",
    )
    .leftJoin(
      "organisation as parentPartnerOrganisation",
      "partnerOrganisation.partnerId",
      "parentPartnerOrganisation.id",
    )
    .select("quote.*", "organisation.partnerId as partnerId")
    .select("partnerOrganisation.partnerId as parentPartnerId")
    .where({ "quote.id": quoteId })
    .first();

  if (!existingQuote) {
    return {
      success: false,
      error: "Quote not found",
    };
  }

  if (existingQuote.archived) {
    return {
      success: false,
      error: "Archived quotes cannot be edited",
    };
  }

  // Check if user is super admin or the partner that owns this quote
  const isSuperAdmin = accessToken.superAdmin;
  const isOwnerPartner =
    accessToken.partner && accessToken.partnerId === existingQuote.partnerId;
  const effectivePartnerBranding = await getEffectivePartnerBranding({
    partnerId: existingQuote.partnerId,
  });
  const partnerBrandName = effectivePartnerBranding?.name?.trim() || "Voxd";
  const canWriteContractNotes =
    !!isSuperAdmin ||
    (!!isOwnerPartner &&
      !!accessToken.adminUserId &&
      (await hasAdminUserPermission({
        adminUserId: accessToken.adminUserId,
        permissionKey: "write_quote_contract_notes",
      })));

  if (!isSuperAdmin && !isOwnerPartner) {
    return {
      success: false,
      error: "You don't have permission to update this quote's pricing",
    };
  }

  // Build the update object based on permissions
  const updateData: Record<string, number | string | null | undefined> = {};

  // Partners can update setupFee, monthlyFee, hourlyRate, and contractLength
  if (isOwnerPartner || isSuperAdmin) {
    if (setupFee !== undefined) updateData.setupFee = setupFee;
    if (monthlyFee !== undefined) updateData.monthlyFee = monthlyFee;
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    if (contractNotes !== undefined) {
      if (!canWriteContractNotes) {
        return {
          success: false,
          error: "You don't have permission to update contract notes",
          fieldErrors: {
            contractNotes: "You have read-only access to contract notes.",
          },
        };
      }

      updateData.contractNotes = contractNotes;
    }
    if (contractLength !== undefined) {
      const minimumPartnerContractLength =
        existingQuote.contractLength != null &&
        existingQuote.contractLength < 12
          ? existingQuote.contractLength
          : 12;

      if (
        !isSuperAdmin &&
        contractLength !== null &&
        contractLength < minimumPartnerContractLength
      ) {
        return {
          success: false,
          error:
            minimumPartnerContractLength < 12
              ? `Contract length must be at least ${minimumPartnerContractLength} months because this quote has already been approved below 12 months.`
              : `Contract length must be at least 12 months. Contact ${partnerBrandName} if you need a shorter contract.`,
          fieldErrors: {
            contractLength:
              minimumPartnerContractLength < 12
                ? `Enter ${minimumPartnerContractLength} months or more, or ask ${partnerBrandName} to approve a shorter term.`
                : `Enter 12 months or more, or ask ${partnerBrandName} to approve a shorter term.`,
          },
        };
      }
      updateData.contractLength = contractLength;
    }
  }

  // Only super admins can update the partner cost fields, buildDays, and freeMonthlyMinutes
  if (isSuperAdmin) {
    if (setupFeeVoxdCost !== undefined)
      updateData.setupFeeVoxdCost = setupFeeVoxdCost;
    if (monthlyFeeVoxdCost !== undefined)
      updateData.monthlyFeeVoxdCost = monthlyFeeVoxdCost;
    if (buildDays !== undefined) updateData.buildDays = buildDays;
    if (freeMonthlyMinutes !== undefined)
      updateData.freeMonthlyMinutes = freeMonthlyMinutes;
  }

  if (Object.keys(updateData).length === 0) {
    return {
      success: false,
      error: "No fields to update",
    };
  }

  // Update the quote
  await db("quote").where({ id: quoteId }).update(updateData);

  return { success: true };
};

export default saUpdateQuotePricing;
