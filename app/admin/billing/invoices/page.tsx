import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { canAccessBillingPages } from "@/lib/billingAccess";
import { notFound } from "next/navigation";
import InvoicesTable from "./invoicesTable";

export default async function Page() {
  const accessToken = await verifyAccessToken();

  if (!(await canAccessBillingPages({ accessToken }))) {
    return notFound();
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Billing" },
          { label: "Invoices" },
        ]}
      />
      <H1>Invoices</H1>
      <InvoicesTable />
    </Container>
  );
}
