import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { notFound } from "next/navigation";
import Container from "@/components/adminui/Container";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import H1 from "@/components/adminui/H1";
import LogExplorer from "@/components/admin/LogExplorer";

export default async function LogPage() {
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
          { label: "Activity Log" },
        ]}
      />
      <H1>Activity Log</H1>
      <p className="text-muted-foreground mb-6">
        View all system activity across all users, API keys, and entities.
      </p>
      <LogExplorer title="" pageSize={50} />
    </Container>
  );
}
