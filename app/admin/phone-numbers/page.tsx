import React from "react";
import PhoneNumberTable from "./phoneNumberTable";

import Container from "@/components/adminui/Container";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import H1 from "@/components/adminui/H1";

export default async function Page() {
  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Phone Numbers" },
        ]}
      />
      <H1>Phone Numbers</H1>

      <PhoneNumberTable />
    </Container>
  );
}
