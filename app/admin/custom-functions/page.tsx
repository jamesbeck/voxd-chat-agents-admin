import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { notFound } from "next/navigation";
import CustomFunctionsTable from "./customFunctionsTable";

export default async function CustomFunctionsPage() {
  const token = await verifyAccessToken();

  if (!token.superAdmin) {
    return notFound();
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Custom Functions" },
        ]}
      />
      <H1>Custom Functions</H1>
      <p className="mb-6 text-muted-foreground">
        View all currently available custom functions that can be discovered in
        the connected backend.
      </p>
      <CustomFunctionsTable />
    </Container>
  );
}
