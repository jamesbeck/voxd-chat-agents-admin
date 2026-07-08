"use server";

import { revalidateTag } from "next/cache";
import dns from "dns";
import { Resend } from "resend";
import { Vercel } from "@vercel/sdk";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import db from "../database/db";
import { ServerActionResponse } from "@/types/types";

const saUpdatePartner = async ({
  partnerId,
  name,
  domain,
  coreDomain,
  providerApiKeyId,
  sendEmailFromDomain,
  salesBotName,
  legalName,
  companyNumber,
  vatNumber,
  registeredAddress,
  legalEmail,
  goCardlessMandateLink,
  salesEmail,
  accountsEmail,
  prototypingAgentId,
  salesBotAgentId,
  hourlyRate,
  monthlyBaseFee,
  monthlyPerIntegration,
  defaultSubPartnerMarkupSetupFee,
  defaultSubPartnerMarkupMonthlyFee,
  defaultSubPartnerMarkupHourlyRate,
  bankAccountNumber,
  bankSortCode,
}: {
  partnerId: string;
  name?: string;
  domain?: string;
  coreDomain?: string;
  providerApiKeyId?: string;
  sendEmailFromDomain?: string;
  salesBotName?: string;
  legalName?: string;
  companyNumber?: string;
  vatNumber?: string;
  registeredAddress?: string;
  legalEmail?: string;
  goCardlessMandateLink?: string;
  salesEmail?: string;
  accountsEmail?: string;
  prototypingAgentId?: string | null;
  salesBotAgentId?: string | null;
  hourlyRate?: number | null;
  monthlyBaseFee?: number | null;
  monthlyPerIntegration?: number | null;
  defaultSubPartnerMarkupSetupFee?: number | null;
  defaultSubPartnerMarkupMonthlyFee?: number | null;
  defaultSubPartnerMarkupHourlyRate?: number | null;
  bankAccountNumber?: string;
  bankSortCode?: string;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  const canUpdatePartner =
    accessToken.superAdmin ||
    (accessToken.partner && accessToken.partnerId === partnerId);

  if (!canUpdatePartner)
    return {
      success: false,
      error: "You do not have permission to update this partner.",
    };

  if (!partnerId) {
    return {
      success: false,
      error: "Partner ID is required",
    };
  }

  // Treat partnerId as the partner organisation id.
  const existingPartner = await db("organisation")
    .select("*")
    .where({ id: partnerId, partner: true })
    .first();

  if (!existingPartner) {
    return {
      success: false,
      error: "Partner not found",
    };
  }

  //update the partner organisation
  await db("organisation")
    .where({ id: partnerId })
    .update({
      name,
      domain,
      coreDomain,
      providerApiKeyId: providerApiKeyId || null,
      sendEmailFromDomain,
      salesBotName,
      legalName,
      companyNumber,
      vatNumber,
      registeredAddress,
      legalEmail,
      goCardlessMandateLink,
      salesEmail,
      accountsEmail,
      prototypingAgentId,
      salesBotAgentId,
      hourlyRate,
      monthlyBaseFee,
      monthlyPerIntegration,
      defaultSubPartnerMarkupSetupFee,
      defaultSubPartnerMarkupMonthlyFee,
      defaultSubPartnerMarkupHourlyRate,
      bankAccountNumber,
      bankSortCode,
    });

  // If sendEmailFromDomain changed, ensure it exists in Resend
  if (
    sendEmailFromDomain &&
    sendEmailFromDomain !== existingPartner.sendEmailFromDomain
  ) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data: listData } = await resend.domains.list();
      const exists = listData?.data?.find(
        (d) => d.name === sendEmailFromDomain,
      );

      if (!exists) {
        const { data: createData } = await resend.domains.create({
          name: sendEmailFromDomain,
        });
        await db("organisation")
          .update({
            sendEmailFromDomainVerified: createData?.status === "verified",
          })
          .where({ id: partnerId });
      } else {
        await db("organisation")
          .update({
            sendEmailFromDomainVerified: exists.status === "verified",
          })
          .where({ id: partnerId });
      }
    } catch {
      // Domain creation is best-effort; don't fail the save
    }
  }

  // If domain changed, ensure it exists in Vercel
  if (domain && domain !== existingPartner.domain) {
    try {
      const vercel = new Vercel({ bearerToken: process.env.VERCEL_API_TOKEN! });
      const result = await vercel.projects.getProjectDomains({
        idOrName: process.env.VERCEL_PROJECT_ID!,
        teamId: process.env.VERCEL_TEAM_ID,
        limit: 100,
      });
      const exists = result.domains?.find((d) => d.name === domain);
      if (!exists) {
        await vercel.projects.addProjectDomain({
          idOrName: process.env.VERCEL_PROJECT_ID!,
          teamId: process.env.VERCEL_TEAM_ID,
          requestBody: { name: domain },
        });
      }
    } catch {
      // Domain creation is best-effort; don't fail the save
    }
  }

  // If coreDomain changed, check CNAME points to core.voxd.ai
  if (coreDomain && coreDomain !== existingPartner.coreDomain) {
    if (coreDomain === "core.voxd.ai") {
      await db("organisation")
        .update({ coreDomainVerified: true })
        .where({ id: partnerId });
    } else {
      try {
        const addresses = await dns.promises.resolveCname(coreDomain);
        const verified = addresses.some(
          (a) => a.replace(/\.$/, "") === "core.voxd.ai",
        );
        await db("organisation")
          .update({ coreDomainVerified: verified })
          .where({ id: partnerId });
      } catch {
        await db("organisation")
          .update({ coreDomainVerified: false })
          .where({ id: partnerId });
      }
    }
  }

  revalidateTag("partners", { expire: 0 });

  return { success: true };
};

export default saUpdatePartner;
