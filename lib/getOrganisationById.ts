import db from "../database/db";

const getOrganisationById = async ({
  organisationId,
}: {
  organisationId: string;
}): Promise<{
  id: string;
  name: string;
  partner: boolean;
  partnerId?: string;
  adminUserIds?: string[];
  webAddress?: string;
  about?: string;
  logoFileExtension?: string;
  showLogoOnColour?: string | null;
  primaryColour?: string | null;
  domain?: string | null;
  coreDomain?: string | null;
  sendEmailFromDomain?: string | null;
  providerApiKeyId?: string | null;
  salesBotName?: string | null;
  salesBotAgentId?: string | null;
  prototypingAgentId?: string | null;
  legalName?: string | null;
  companyNumber?: string | null;
  vatNumber?: string | null;
  registeredAddress?: string | null;
  legalEmail?: string | null;
  goCardlessMandateLink?: string | null;
  salesEmail?: string | null;
  accountsEmail?: string | null;
  bankAccountNumber?: string | null;
  bankSortCode?: string | null;
  billingAddress?: string | null;
  billingPostcode?: string | null;
  billingEmails?: string | null;
  gcMandateId?: string | null;
  hourlyRate?: number | null;
  monthlyBaseFee?: number | null;
  monthlyPerIntegration?: number | null;
  defaultSubPartnerMarkupSetupFee?: number | null;
  defaultSubPartnerMarkupMonthlyFee?: number | null;
  defaultSubPartnerMarkupHourlyRate?: number | null;
}> => {
  const organisation = await db("organisation")
    .leftJoin("adminUser", "organisation.id", "adminUser.organisationId")
    .groupBy("organisation.id")
    .select("organisation.*")
    .select([
      db.raw(
        'COALESCE(ARRAY_AGG("adminUser"."id") FILTER (WHERE "adminUser"."id" IS NOT NULL), ARRAY[]::uuid[]) as "adminUserIds"',
      ),
    ])
    .where("organisation.id", organisationId)
    .first();

  return organisation;
};

export default getOrganisationById;
