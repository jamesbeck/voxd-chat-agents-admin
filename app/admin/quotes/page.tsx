import React from "react";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { notFound } from "next/navigation";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import QuotesTable from "@/components/admin/QuotesTable";
import NewQuoteButton from "@/components/admin/NewQuoteButton";
import { getAccessiblePartnerFilterOptions } from "@/lib/organisationAccess";
import { canAdminUserReadAllQuotes } from "@/lib/quoteAccess";

export default async function Page() {
  const accessToken = await verifyAccessToken();

  if (!accessToken?.partner && !accessToken?.superAdmin) notFound();

  const isSuperAdmin = accessToken?.superAdmin ?? false;
  const partnerId = accessToken?.partnerId ?? null;
  const canReadAllQuotes = await canAdminUserReadAllQuotes({ accessToken });
  const partnerFilterOptions = await getAccessiblePartnerFilterOptions({
    accessToken,
  });

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[{ label: "Admin", href: "/" }, { label: "Quotes" }]}
      />
      <H1>Quotes</H1>

      <div className="flex justify-end mb-4">
        <NewQuoteButton />
      </div>

      <QuotesTable
        isSuperAdmin={isSuperAdmin}
        userPartnerId={partnerId}
        showOwnerFilter={canReadAllQuotes}
        partnerFilterOptions={partnerFilterOptions}
      />
    </Container>
  );
}
