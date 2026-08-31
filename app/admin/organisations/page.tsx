import React from "react";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import OrganisationsTable from "./organisationsTable";
import NewOrganisationButton from "@/components/admin/NewOrganisationButton";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import {
  canAdminUserReadAllOrganisations,
  getAccessiblePartnerFilterOptions,
} from "@/lib/organisationAccess";

export default async function Page() {
  const accessToken = await verifyAccessToken();

  const isSuperAdmin = accessToken?.superAdmin ?? false;
  const userPartnerId = accessToken?.partnerId ?? null;
  const canReadAllOrganisations = await canAdminUserReadAllOrganisations({
    accessToken,
  });
  const partnerFilterOptions = await getAccessiblePartnerFilterOptions({
    accessToken,
  });

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Organisations" },
        ]}
      />
      <H1>Organisations</H1>

      <div className="flex justify-end mb-4">
        <NewOrganisationButton />
      </div>

      <OrganisationsTable
        isSuperAdmin={isSuperAdmin}
        userPartnerId={userPartnerId}
        showOwnerFilter={canReadAllOrganisations}
        partnerFilterOptions={partnerFilterOptions}
      />
    </Container>
  );
}
