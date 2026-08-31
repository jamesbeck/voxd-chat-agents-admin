import H1 from "@/components/adminui/H1";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import FilesTable from "./filesTable";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { redirect } from "next/navigation";

export default async function Page() {
  const token = await verifyAccessToken();

  if (!token.superAdmin) {
    redirect("/");
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[{ label: "Admin", href: "/" }, { label: "Files" }]}
      />
      <H1>Files</H1>

      <FilesTable />
    </Container>
  );
}
