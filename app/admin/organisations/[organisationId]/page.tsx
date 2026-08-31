import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import { TabsContent } from "@/components/ui/tabs";
import RecordTabs, { RecordTab } from "@/components/admin/RecordTabs";
import H1 from "@/components/adminui/H1";
import getOrganisationById from "@/lib/getOrganisationById";
import Container from "@/components/adminui/Container";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { notFound } from "next/navigation";
import AgentsTable from "./agentsTable";
import NewOrganisationForm from "./newOrganisationForm";
import AdminUsersTable from "./adminUsersTable";
import ChatUsersTable from "./chatUsersTable";
import QuotesTable from "@/components/admin/QuotesTable";
import OrganisationActions from "./organisationActions";
import NewQuoteButton from "@/components/admin/NewQuoteButton";
import AboutTab from "./aboutTab";
import BillingTab from "./billingTab";
import LogoTab from "./logoTab";
import ProviderApiKeysTable from "@/app/admin/provider-api-keys/providerApiKeysTable";
import NewProviderApiKeyDialog from "@/app/admin/provider-api-keys/NewProviderApiKeyDialog";
import userCanViewOrganisation from "@/lib/organisationAccess";
import EditPartnerDomainsForm from "./partnerSettings/EditPartnerDomainsForm";
import EditPartnerPrototypingForm from "./partnerSettings/EditPartnerPrototypingForm";
import EditPartnerSalesAgentForm from "./partnerSettings/EditPartnerSalesAgentForm";
import EditPartnerPricingForm from "./partnerSettings/EditPartnerPricingForm";
import EditPartnerContactLegalForm from "./partnerSettings/EditPartnerContactLegalForm";
import { hasAdminUserPermission } from "@/lib/adminUserPermissions";
import db from "@/database/db";

export default async function Page({
  params,
  searchParams,
}: {
  params: { organisationId: string };
  searchParams: { tab?: string };
}) {
  const token = await verifyAccessToken();
  const canWriteUsers =
    token.superAdmin ||
    (await hasAdminUserPermission({
      adminUserId: token.adminUserId,
      permissionKey: "write_users",
    }));

  const organisationId = (await params).organisationId;
  const requestedTab = (await searchParams).tab || "agents";

  let organisation;

  if (organisationId && organisationId != "new")
    organisation = await getOrganisationById({
      organisationId: organisationId,
    });
  if (!organisation && organisationId !== "new") return notFound();

  if (
    organisation &&
    !(await userCanViewOrganisation({ organisationId, accessToken: token }))
  ) {
    return notFound();
  }

  const showPartnerTabs =
    !!organisation?.partner && (token.superAdmin || token.partner);
  const canViewPartnerPricing = !!organisation?.partner && token.superAdmin;
  const normalizedRequestedTab =
    requestedTab === "partnerDetails"
      ? "about"
      : requestedTab === "partnerApiKey"
        ? "providerApiKeys"
        : requestedTab;
  const activeTab =
    normalizedRequestedTab === "partnerPricing" && !canViewPartnerPricing
      ? "about"
      : normalizedRequestedTab;

  let prototypingAgentLabel: string | undefined;
  let salesBotAgentLabel: string | undefined;

  if (organisation?.prototypingAgentId) {
    const agent = await db("agent")
      .select(
        "agent.niceName",
        "agent.name",
        "organisation.name as organisationName",
      )
      .leftJoin("organisation", "agent.organisationId", "organisation.id")
      .where("agent.id", organisation.prototypingAgentId)
      .first();
    if (agent) {
      prototypingAgentLabel = `${agent.organisationName || "No Organisation"} - ${agent.niceName || agent.name}`;
    }
  }

  if (organisation?.salesBotAgentId) {
    const agent = await db("agent")
      .select(
        "agent.niceName",
        "agent.name",
        "organisation.name as organisationName",
      )
      .leftJoin("organisation", "agent.organisationId", "organisation.id")
      .where("agent.id", organisation.salesBotAgentId)
      .first();
    if (agent) {
      salesBotAgentLabel = `${agent.organisationName || "No Organisation"} - ${agent.niceName || agent.name}`;
    }
  }

  const hasChildOrganisations = organisation
    ? !!(await db("organisation")
        .select("id")
        .where("partnerId", organisation.id)
        .first())
    : false;

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Organisations", href: "/organisations" },
          { label: organisation?.name || "New Organisation" },
        ]}
      />
      <H1>{organisation?.name || "New Organisation"}</H1>
      {organisation && (
        <>
          <RecordTabs
            value={activeTab}
            tabs={
              [
                {
                  value: "about",
                  label: "About",
                  href: `/organisations/${organisation.id}?tab=about`,
                },
                {
                  value: "logo",
                  label: "Logo & Branding",
                  href: `/organisations/${organisation.id}?tab=logo`,
                },
                {
                  value: "billing",
                  label: "Billing",
                  href: `/organisations/${organisation.id}?tab=billing`,
                },
                ...(token.superAdmin || token.partner
                  ? [
                      {
                        value: "quotes",
                        label: "Quotes",
                        href: `/organisations/${organisation.id}?tab=quotes`,
                      },
                    ]
                  : []),
                {
                  value: "adminUsers",
                  label: "Admin Users",
                  href: `/organisations/${organisation.id}?tab=adminUsers`,
                },
                {
                  value: "chatUsers",
                  label: "Chat Users",
                  href: `/organisations/${organisation.id}?tab=chatUsers`,
                },
                {
                  value: "agents",
                  label: "Agents",
                  href: `/organisations/${organisation.id}?tab=agents`,
                },
                ...(showPartnerTabs
                  ? [
                      {
                        value: "partnerDomains",
                        label: "Domains",
                        href: `/organisations/${organisation.id}?tab=partnerDomains`,
                      },
                      {
                        value: "partnerPrototyping",
                        label: "Prototyping",
                        href: `/organisations/${organisation.id}?tab=partnerPrototyping`,
                      },
                      {
                        value: "partnerSalesAgent",
                        label: "Sales Agent",
                        href: `/organisations/${organisation.id}?tab=partnerSalesAgent`,
                      },
                      {
                        value: "partnerPricing",
                        label: "Pricing",
                        href: `/organisations/${organisation.id}?tab=partnerPricing`,
                      },
                      {
                        value: "partnerContactLegal",
                        label: "Contact & Legal",
                        href: `/organisations/${organisation.id}?tab=partnerContactLegal`,
                      },
                    ].filter(
                      (tab) =>
                        tab.value !== "partnerPricing" || canViewPartnerPricing,
                    )
                  : []),
                ...(organisation
                  ? [
                      {
                        value: "providerApiKeys",
                        label: "API Keys",
                        href: `/organisations/${organisation.id}?tab=providerApiKeys`,
                      },
                    ]
                  : []),
              ] satisfies RecordTab[]
            }
            actions={
              token.superAdmin || token.partner ? (
                <OrganisationActions
                  organisationId={organisation.id}
                  name={organisation.name}
                  webAddress={organisation.webAddress}
                  partner={organisation.partner}
                  hasChildOrganisations={hasChildOrganisations}
                  isSuperAdmin={token.superAdmin}
                  currentPartnerId={organisation.partnerId ?? null}
                />
              ) : undefined
            }
          >
            <TabsContent value="about">
              <Container>
                <AboutTab
                  organisationId={organisation.id}
                  about={organisation.about ?? null}
                />
              </Container>
            </TabsContent>
            <TabsContent value="logo">
              <Container>
                <LogoTab
                  organisationId={organisation.id}
                  logoFileExtension={organisation.logoFileExtension ?? null}
                  showLogoOnColour={organisation.showLogoOnColour ?? null}
                  primaryColour={organisation.primaryColour ?? null}
                  partner={organisation.partner}
                  showParentBrandingWarning={organisation.partner}
                />
              </Container>
            </TabsContent>
            <TabsContent value="billing">
              <Container>
                <BillingTab
                  organisationId={organisation.id}
                  billingAddress={organisation.billingAddress ?? null}
                  billingPostcode={organisation.billingPostcode ?? null}
                  billingEmails={organisation.billingEmails ?? null}
                  gcMandateId={organisation.gcMandateId ?? null}
                />
              </Container>
            </TabsContent>
            <TabsContent value="adminUsers">
              <Container>
                <AdminUsersTable
                  organisationId={organisation.id}
                  canWriteUsers={canWriteUsers}
                />
              </Container>
            </TabsContent>
            <TabsContent value="chatUsers">
              <Container>
                <ChatUsersTable organisationId={organisation.id} />
              </Container>
            </TabsContent>
            <TabsContent value="agents">
              <Container>
                <AgentsTable organisationId={organisation.id} />
              </Container>
            </TabsContent>
            {showPartnerTabs ? (
              <TabsContent value="partnerDomains">
                <Container>
                  <EditPartnerDomainsForm
                    partnerId={organisation.id}
                    domain={organisation.domain ?? undefined}
                    coreDomain={organisation.coreDomain ?? undefined}
                    sendEmailFromDomain={
                      organisation.sendEmailFromDomain ?? undefined
                    }
                  />
                </Container>
              </TabsContent>
            ) : null}
            {showPartnerTabs ? (
              <TabsContent value="partnerPrototyping">
                <Container>
                  <EditPartnerPrototypingForm
                    partnerId={organisation.id}
                    prototypingAgentId={organisation.prototypingAgentId}
                    prototypingAgentLabel={prototypingAgentLabel}
                  />
                </Container>
              </TabsContent>
            ) : null}
            {showPartnerTabs ? (
              <TabsContent value="partnerSalesAgent">
                <Container>
                  <EditPartnerSalesAgentForm
                    partnerId={organisation.id}
                    salesBotAgentId={organisation.salesBotAgentId}
                    salesBotAgentLabel={salesBotAgentLabel}
                    salesBotName={organisation.salesBotName ?? undefined}
                  />
                </Container>
              </TabsContent>
            ) : null}
            {canViewPartnerPricing ? (
              <TabsContent value="partnerPricing">
                <Container>
                  <EditPartnerPricingForm
                    partnerId={organisation.id}
                    hourlyRate={organisation.hourlyRate}
                    monthlyBaseFee={organisation.monthlyBaseFee}
                    monthlyPerIntegration={organisation.monthlyPerIntegration}
                  />
                </Container>
              </TabsContent>
            ) : null}
            {showPartnerTabs ? (
              <TabsContent value="partnerContactLegal">
                <Container>
                  <EditPartnerContactLegalForm
                    partnerId={organisation.id}
                    salesEmail={organisation.salesEmail ?? undefined}
                    accountsEmail={organisation.accountsEmail ?? undefined}
                    legalName={organisation.legalName ?? undefined}
                    companyNumber={organisation.companyNumber ?? undefined}
                    vatNumber={organisation.vatNumber ?? undefined}
                    registeredAddress={
                      organisation.registeredAddress ?? undefined
                    }
                    legalEmail={organisation.legalEmail ?? undefined}
                    bankAccountNumber={
                      organisation.bankAccountNumber ?? undefined
                    }
                    bankSortCode={organisation.bankSortCode ?? undefined}
                  />
                </Container>
              </TabsContent>
            ) : null}
            {organisation ? (
              <TabsContent value="providerApiKeys">
                <Container>
                  <div className="flex justify-end mb-4">
                    <NewProviderApiKeyDialog
                      preselectedOrganisationId={organisation.id}
                      preselectedOrganisationName={organisation.name}
                    />
                  </div>
                  <ProviderApiKeysTable
                    organisationId={organisation.id}
                    allowDelete
                    partnerId={
                      organisation.partner ? organisation.id : undefined
                    }
                    currentPartnerProviderApiKeyId={
                      organisation.partner
                        ? (organisation.providerApiKeyId ?? null)
                        : undefined
                    }
                  />
                </Container>
              </TabsContent>
            ) : null}
            {token.superAdmin || token.partner ? (
              <TabsContent value="quotes">
                <Container>
                  {!organisation.partner ? (
                    <div className="flex justify-end mb-4">
                      <NewQuoteButton organisationId={organisation.id} />
                    </div>
                  ) : null}
                  <QuotesTable
                    organisationId={
                      organisation.partner ? undefined : organisation.id
                    }
                    partnerId={
                      organisation.partner ? organisation.id : undefined
                    }
                  />
                </Container>
              </TabsContent>
            ) : null}
          </RecordTabs>
        </>
      )}
      {!organisation && <NewOrganisationForm />}
    </Container>
  );
}
