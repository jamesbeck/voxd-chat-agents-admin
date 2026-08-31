import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { notFound } from "next/navigation";
import CustomFunctionRunsTable from "./customFunctionRunsTable";

export default async function CustomFunctionRunsPage() {
  const token = await verifyAccessToken();

  if (!token.superAdmin) {
    return notFound();
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Custom Function Logs" },
        ]}
      />
      <H1>Custom Function Logs</H1>
      <p className="mb-6 text-muted-foreground">
        Review custom function runs across all agents, including scope, status,
        and execution timing.
      </p>
      <CustomFunctionRunsTable />
    </Container>
  );
}
