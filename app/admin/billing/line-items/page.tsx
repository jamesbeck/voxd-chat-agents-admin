import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { canAccessBillingPages } from "@/lib/billingAccess";
import { getBillingLineItemFormOptions } from "@/lib/billingLineItemFormOptions";
import { notFound } from "next/navigation";
import LineItemsTable from "./lineItemsTable";

export default async function Page() {
  const accessToken = await verifyAccessToken();

  if (!(await canAccessBillingPages({ accessToken }))) {
    return notFound();
  }

  const { agentOptions, organisationOptions, partnerOptions } =
    await getBillingLineItemFormOptions({ accessToken });

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Billing" },
          { label: "Line Items" },
        ]}
      />
      <H1>Line Items</H1>
      <LineItemsTable
        agentOptions={agentOptions}
        organisationOptions={organisationOptions}
        partnerOptions={partnerOptions}
      />
    </Container>
  );
}
