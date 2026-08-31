import React from "react";
import WabaCard from "@/components/admin/wabaCard";
import WabasTable from "../wabasTable";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { notFound } from "next/navigation";
import WabasActions from "./WabasActions";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";

export default async function Page() {
  const accessToken = await verifyAccessToken();

  if (!accessToken?.superAdmin) notFound();

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[{ label: "Admin", href: "/" }, { label: "Wabas" }]}
      />

      <H1 className="text-2xl font-semibold mb-4">
        WhatsApp Business Organisations
      </H1>

      <WabasActions />

      <WabasTable />
    </Container>
  );
}
