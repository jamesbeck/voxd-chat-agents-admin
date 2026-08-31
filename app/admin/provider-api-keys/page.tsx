import H1 from "@/components/adminui/H1";
import Container from "@/components/adminui/Container";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { notFound } from "next/navigation";
import ProviderApiKeysTable from "./providerApiKeysTable";
import NewProviderApiKeyDialog from "./NewProviderApiKeyDialog";

export default async function Page() {
  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    return notFound();
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Provider API Keys" },
        ]}
      />
      <H1>Provider API Keys</H1>

      <div className="flex justify-end mb-4">
        <NewProviderApiKeyDialog />
      </div>

      <ProviderApiKeysTable allowDelete />
    </Container>
  );
}
