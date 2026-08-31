import { verifyAccessToken } from "@/lib/auth/verifyToken";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";

export default async function AdminHome() {
  const accessToken = await verifyAccessToken();

  let adminAreaTitle = "Customer Admin Area";
  if (accessToken.partner) adminAreaTitle = "Partner Admin Area";
  if (accessToken.superAdmin) adminAreaTitle = "VOXD Master Admin Area";

  return (
    <Container>
      <BreadcrumbSetter breadcrumbs={[{ label: "Admin" }]} />
      <H1>{adminAreaTitle}</H1>
      {!!accessToken.superAdmin && <p>Welcome, Master Admin!</p>}
      {!!accessToken.partner && <p>Welcome to your partner admin area.</p>}
    </Container>
  );
}
