import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import NewOrganisationForm from "./newQuoteForm";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import { notFound } from "next/navigation";
import db from "@/database/db";
import getOrganisations from "@/lib/getOrganisations";
import { getQuoteById, Quote } from "@/lib/getQuoteById";
import { TabsContent } from "@/components/ui/tabs";
import RecordTabs, { RecordTab } from "@/components/admin/RecordTabs";
import { format, formatDistance } from "date-fns";
import EditSpecificationForm from "./editSpecificationForm";
import EditPricingForm from "./EditPricingForm";
import ExampleConversationsTab from "@/components/admin/ExampleConversationsTab";
import QuoteActions from "./QuoteActions";
import DataCard from "@/components/adminui/DataCard";
import {
  Calendar,
  FileText,
  Building,
  User,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import EditProposalForm from "./EditProposalForm";
import EditQuoteTitleDialog from "./EditQuoteTitleDialog";
import EditBackgroundForm from "./EditBackgroundForm";
import EditConceptForm from "./EditConceptForm";
import QuoteViewsTable from "./QuoteViewsTable";
import QuoteHeroImageTab from "./QuoteHeroImageTab";
import userCanViewQuote from "@/lib/quoteAccess";
import { hasAdminUserPermission } from "@/lib/adminUserPermissions";
import { Badge } from "@/components/ui/badge";

const applyMarkup = (
  value: number | null | undefined,
  multiplier: number,
): number | null => {
  if (value == null) {
    return null;
  }

  return Number((Number(value) * multiplier).toFixed(2));
};

export default async function Page({
  params,
  searchParams,
}: {
  params: { quoteId: string };
  searchParams: { tab?: string };
}) {
  const quoteId = (await params).quoteId;
  const activeTab = (await searchParams).tab || "info";

  let quote: Quote | null = null;

  if (quoteId && quoteId != "new")
    quote = await getQuoteById({ quoteId: quoteId });

  if (!quote && quoteId !== "new") return notFound();

  //get organisations for the select
  const organisations = await getOrganisations();

  // Get access token to determine user permissions
  const accessToken = await verifyAccessToken();

  if (quote && !(await userCanViewQuote({ quoteId, accessToken }))) {
    return notFound();
  }

  const isSuperAdmin = accessToken.superAdmin;
  const isOwnerPartner =
    accessToken.partner && quote?.partnerId === accessToken.partnerId;
  const canViewCostPrice =
    !!isSuperAdmin ||
    (!!accessToken.adminUserId &&
      (await hasAdminUserPermission({
        adminUserId: accessToken.adminUserId,
        permissionKey: "view_cost_price",
      })));
  const canWriteQuoteContractNotes =
    !!isSuperAdmin ||
    (!!isOwnerPartner &&
      !!accessToken.adminUserId &&
      (await hasAdminUserPermission({
        adminUserId: accessToken.adminUserId,
        permissionKey: "write_quote_contract_notes",
      })));

  const displayedSetupFeeVoxdCost = isSuperAdmin
    ? (quote?.setupFeeVoxdCost ?? null)
    : (quote?.effectiveSetupFeeVoxdCost ?? null);
  const displayedMonthlyFeeVoxdCost = isSuperAdmin
    ? (quote?.monthlyFeeVoxdCost ?? null)
    : (quote?.effectiveMonthlyFeeVoxdCost ?? null);
  const displayedHourlyRateVoxdCost = isSuperAdmin
    ? (quote?.hourlyRateVoxdCost ?? null)
    : (quote?.effectiveHourlyRateVoxdCost ?? null);
  const upstreamPartnerName = quote?.parentPartnerName || "Voxd";
  const viewerPartnerId = accessToken.partnerId
    ? accessToken.partnerId
    : accessToken.organisationIsPartner
      ? (accessToken.organisationId ?? null)
      : (accessToken.organisationPartnerId ?? null);
  const viewerPricingChainIndex = viewerPartnerId
    ? (quote?.partnerPricingChain.findIndex(
        (step) => step.billedToPartnerId === viewerPartnerId,
      ) ?? -1)
    : -1;
  const pricingQuote = quote;
  const visiblePricingChain = pricingQuote
    ? !isSuperAdmin && viewerPartnerId
      ? pricingQuote.partnerPricingChain.slice(
          0,
          viewerPricingChainIndex >= 0 ? viewerPricingChainIndex + 1 : 1,
        )
      : pricingQuote.partnerPricingChain
    : [];
  const visibleViewerPricingStep = visiblePricingChain.at(-1);
  const costBreakdownSetupRate = isSuperAdmin
    ? (quote?.hourlyRateVoxdCost ?? null)
    : visibleViewerPricingStep
      ? applyMarkup(
          pricingQuote?.hourlyRateVoxdCost ?? null,
          visibleViewerPricingStep.setupFeeMultiplier,
        )
      : displayedHourlyRateVoxdCost;
  const pricingChain =
    pricingQuote && visiblePricingChain.length
      ? visiblePricingChain.map((step) => ({
          billedByPartnerName: step.billedByPartnerName,
          billedToPartnerName: step.billedToPartnerName,
          setupFeeCost: applyMarkup(
            pricingQuote.setupFeeVoxdCost,
            step.setupFeeMultiplier,
          ),
          setupHourlyRateCost: applyMarkup(
            pricingQuote.hourlyRateVoxdCost,
            step.setupFeeMultiplier,
          ),
          monthlyFeeCost: applyMarkup(
            pricingQuote.monthlyFeeVoxdCost,
            step.monthlyFeeMultiplier,
          ),
          hourlyRateCost: applyMarkup(
            pricingQuote.hourlyRateVoxdCost,
            step.hourlyRateMultiplier,
          ),
        }))
      : pricingQuote
        ? [
            {
              billedByPartnerName: upstreamPartnerName,
              billedToPartnerName:
                pricingQuote.effectivePartnerName || "Partner",
              setupFeeCost: displayedSetupFeeVoxdCost,
              setupHourlyRateCost: costBreakdownSetupRate,
              monthlyFeeCost: displayedMonthlyFeeVoxdCost,
              hourlyRateCost: displayedHourlyRateVoxdCost,
            },
          ]
        : [];

  // Fetch prototypingAgentId from the partner organisation that owns this quote's organisation
  let prototypingAgentId: string | null = null;
  if (quote?.partnerId) {
    const partner = await db("organisation")
      .select("prototypingAgentId")
      .where("id", quote.partnerId)
      .first();
    prototypingAgentId = partner?.prototypingAgentId || null;
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Quotes", href: "/quotes" },
          quote
            ? {
                label: quote.organisationName,
                href: `/organisations/${quote.organisationId}`,
              }
            : null,
          { label: quote ? quote.title : "New Quote" },
        ]}
      />
      <H1>
        {quote ? (
          <span className="inline-flex items-center gap-2">
            {quote.organisationName} - {quote.title}
            {quote.archived && <Badge variant="outline">Archived</Badge>}
            <EditQuoteTitleDialog
              quoteId={quote.id}
              title={quote.title}
              archived={quote.archived}
            />
          </span>
        ) : (
          "New Quote"
        )}
      </H1>

      {quote && (
        <>
          <RecordTabs
            value={activeTab}
            tabs={
              [
                {
                  value: "info",
                  label: "Info",
                  href: `/quotes/${quote.id}?tab=info`,
                },
                {
                  value: "background",
                  label: "Background",
                  href: `/quotes/${quote.id}?tab=background`,
                },
                {
                  value: "specification",
                  label: "Specification",
                  href: `/quotes/${quote.id}?tab=specification`,
                },
                {
                  value: "concept",
                  label: "Concept",
                  href: `/quotes/${quote.id}?tab=concept`,
                },
                {
                  value: "proposal",
                  label: "Proposal",
                  href: `/quotes/${quote.id}?tab=proposal`,
                },
                {
                  value: "pricing",
                  label: "Pricing",
                  href: `/quotes/${quote.id}?tab=pricing`,
                },
                {
                  value: "exampleConversations",
                  label: "Example Conversations",
                  href: `/quotes/${quote.id}?tab=exampleConversations`,
                },
                {
                  value: "heroImage",
                  label: "Hero Image",
                  href: `/quotes/${quote.id}?tab=heroImage`,
                },
                {
                  value: "views",
                  label: "Views",
                  href: `/quotes/${quote.id}?tab=views`,
                },
              ] satisfies RecordTab[]
            }
            actions={
              <QuoteActions
                quoteId={quote.id}
                shortLinkId={quote.shortLinkId}
                name={quote.title}
                organisationName={quote.organisationName}
                organisationId={quote.organisationId}
                prototypingAgentId={prototypingAgentId}
                archived={quote.archived}
                canDelete={isSuperAdmin || isOwnerPartner}
                createdByAdminUserId={quote.createdByAdminUserId}
              />
            }
          >
            <TabsContent value="info">
              <DataCard
                items={[
                  {
                    label: "Quote ID",
                    value: quote.id,
                    icon: <FileText className="h-4 w-4" />,
                  },
                  {
                    label: "Short Link ID",
                    value: quote.shortLinkId,
                    icon: <FileText className="h-4 w-4" />,
                  },
                  {
                    label: "Created",
                    value: format(quote.createdAt, "dd/MM/yyyy HH:mm"),
                    description: formatDistance(quote.createdAt, new Date(), {
                      addSuffix: true,
                    }),
                    icon: <Calendar className="h-4 w-4" />,
                  },
                  {
                    label: "Organisation",
                    value: (
                      <Link
                        href={`/organisations/${quote.organisationId}`}
                        className="text-primary hover:underline"
                      >
                        {quote.organisationName}
                      </Link>
                    ),
                    icon: <Building className="h-4 w-4" />,
                  },
                  {
                    label: "Owner",
                    value: quote.ownerName ? (
                      <div>
                        <div>{quote.ownerName}</div>
                        {quote.ownerEmail && (
                          <div className="text-sm text-muted-foreground">
                            {quote.ownerEmail}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        Not assigned
                      </span>
                    ),
                    icon: <User className="h-4 w-4" />,
                  },
                ]}
              />
            </TabsContent>
            <TabsContent value="background">
              <EditBackgroundForm
                quoteId={quote.id}
                background={quote.background}
                archived={quote.archived}
              />
            </TabsContent>
            <TabsContent value="specification">
              <EditSpecificationForm
                quoteId={quote.id}
                objectives={quote.objectives}
                dataSourcesAndIntegrations={quote.dataSourcesAndIntegrations}
                otherNotes={quote.otherNotes}
                archived={quote.archived}
                isSuperAdmin={isSuperAdmin}
                quoteIntegrations={quote.quoteIntegrations}
                quoteKnowledgeSources={quote.quoteKnowledgeSources}
              />
            </TabsContent>
            <TabsContent value="concept">
              <EditConceptForm
                quoteId={quote.id}
                conceptPersonalMessage={quote.conceptPersonalMessage}
                generatedConceptIntroduction={
                  quote.generatedConceptIntroduction
                }
                generatedConcept={quote.generatedConcept}
                conceptHideSections={quote.conceptHideSections}
              />
            </TabsContent>
            <TabsContent value="proposal">
              <EditProposalForm
                quoteId={quote.id}
                proposalPersonalMessage={quote.proposalPersonalMessage}
                generatedProposalIntroduction={
                  quote.generatedProposalIntroduction
                }
                generatedSpecification={quote.generatedSpecification}
                proposalHideSections={quote.proposalHideSections}
              />
            </TabsContent>
            <TabsContent value="pricing">
              <EditPricingForm
                quoteId={quote.id}
                effectivePartnerName={quote.effectivePartnerName}
                upstreamPartnerName={upstreamPartnerName}
                pricingChain={pricingChain}
                setupFee={quote.setupFee}
                monthlyFee={quote.monthlyFee}
                hourlyRate={quote.hourlyRate}
                contractNotes={quote.contractNotes}
                setupFeeVoxdCost={
                  canViewCostPrice ? displayedSetupFeeVoxdCost : null
                }
                monthlyFeeVoxdCost={
                  canViewCostPrice ? displayedMonthlyFeeVoxdCost : null
                }
                buildDays={canViewCostPrice ? quote.buildDays : null}
                freeMonthlyMinutes={
                  canViewCostPrice ? quote.freeMonthlyMinutes : null
                }
                contractLength={quote.contractLength}
                costingBreakdown={
                  canViewCostPrice ? quote.costingBreakdown : null
                }
                hourlyRateVoxdCost={
                  canViewCostPrice ? displayedHourlyRateVoxdCost : null
                }
                costBreakdownSetupRate={
                  canViewCostPrice ? costBreakdownSetupRate : null
                }
                monthlyBaseFeeVoxdCost={
                  isSuperAdmin && canViewCostPrice
                    ? quote.partnerMonthlyBaseFee
                    : null
                }
                monthlyPerIntegrationVoxdCost={
                  isSuperAdmin && canViewCostPrice
                    ? quote.partnerMonthlyPerIntegration
                    : null
                }
                hasGeneratedConcept={!!quote.generatedConcept}
                hasGeneratedProposal={!!quote.generatedSpecification}
                isSuperAdmin={isSuperAdmin}
                isOwnerPartner={isOwnerPartner}
                canViewCostPrice={canViewCostPrice}
                canWriteContractNotes={canWriteQuoteContractNotes}
              />
            </TabsContent>
            <TabsContent value="exampleConversations">
              <ExampleConversationsTab
                quoteId={quote.id}
                conversations={quote.exampleConversations}
                businessName={quote.organisationName}
              />
            </TabsContent>
            <TabsContent value="heroImage">
              <QuoteHeroImageTab
                quoteId={quote.id}
                heroImageFileExtension={quote.heroImageFileExtension}
              />
            </TabsContent>
            <TabsContent value="views">
              <QuoteViewsTable quoteId={quote.id} />
            </TabsContent>
          </RecordTabs>
        </>
      )}

      {!quote && (
        <NewOrganisationForm
          organisationOptions={organisations.map((o) => ({
            label: o.name,
            value: o.id,
          }))}
        />
      )}
    </Container>
  );
}
