import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import RecordTabs from "@/components/admin/RecordTabs";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import { TabsContent } from "@/components/ui/tabs";
import db from "@/database/db";
import {
  canAccessBillingPages,
  canMutateBillingRecords,
  userCanViewInvoiceLineItem,
} from "@/lib/billingAccess";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { getBillingLineItemFormOptions } from "@/lib/billingLineItemFormOptions";
import { notFound } from "next/navigation";
import LineItemDetailsTab from "./lineItemDetailsTab";
import LineItemActions from "./lineItemActions";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ lineItemId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const accessToken = await verifyAccessToken();

  if (!(await canAccessBillingPages({ accessToken }))) {
    return notFound();
  }

  const lineItemId = (await params).lineItemId;
  const requestedTab = (await searchParams).tab || "details";
  const activeTab = requestedTab === "details" ? requestedTab : "details";

  if (!(await userCanViewInvoiceLineItem({ lineItemId, accessToken }))) {
    return notFound();
  }

  const lineItem = await db("invoiceLineItem")
    .leftJoin("invoice", "invoice.id", "invoiceLineItem.invoiceId")
    .leftJoin("agent", "agent.id", "invoiceLineItem.agentId")
    .leftJoin(
      "organisation as toOrganisation",
      "toOrganisation.id",
      "invoiceLineItem.toOrganisationId",
    )
    .leftJoin(
      "organisation as toPartnerOrganisation",
      "toPartnerOrganisation.id",
      "invoiceLineItem.toPartnerId",
    )
    .select(
      "invoiceLineItem.*",
      "invoice.number as invoiceNumber",
      "agent.name as agentName",
      "agent.niceName as agentNiceName",
      "toOrganisation.name as toOrganisationName",
      "toPartnerOrganisation.name as toPartnerName",
    )
    .where("invoiceLineItem.id", lineItemId)
    .first();

  if (!lineItem) {
    return notFound();
  }

  const canEdit = await canMutateBillingRecords({ accessToken });
  const { agentOptions, organisationOptions, partnerOptions } =
    await getBillingLineItemFormOptions({ accessToken });

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Billing" },
          { label: "Line Items", href: "/billing/line-items" },
          { label: lineItem.description },
        ]}
      />
      <H1>{lineItem.description}</H1>

      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "details",
            label: "Details",
            href: `/billing/line-items/${lineItemId}?tab=details`,
          },
        ]}
        actions={
          canEdit ? (
            <LineItemActions
              lineItemId={lineItemId}
              description={lineItem.description}
            />
          ) : undefined
        }
      >
        <TabsContent value="details">
          <Container>
            <LineItemDetailsTab
              lineItem={lineItem}
              canEdit={canEdit}
              agentOptions={agentOptions}
              organisationOptions={organisationOptions}
              partnerOptions={partnerOptions}
            />
          </Container>
        </TabsContent>
      </RecordTabs>
    </Container>
  );
}
