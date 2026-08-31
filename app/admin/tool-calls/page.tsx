import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { notFound } from "next/navigation";
import Container from "@/components/adminui/Container";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import H1 from "@/components/adminui/H1";
import ToolCallsTable from "./toolCallsTable";

export default async function ToolCallsPage() {
  const token = await verifyAccessToken();

  // Only super admins can access this page
  if (!token.superAdmin) {
    return notFound();
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Tool Calls" },
        ]}
      />
      <H1>Tool Calls</H1>
      <p className="text-muted-foreground mb-6">
        View all tool calls made by AI agents across all sessions.
      </p>
      <ToolCallsTable />
    </Container>
  );
}
