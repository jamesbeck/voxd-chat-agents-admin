import H1 from "@/components/adminui/H1";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import OAuthAccountsTable from "./oauthAccountsTable";
import ConnectGoogleButton from "./connectGoogleButton";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const { connected } = await searchParams;

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Connected Accounts" },
        ]}
      />
      <H1>Connected Accounts</H1>
      <p>
        Connect external accounts to enable integrations like Google Calendar.
        These connections use OAuth and require periodic re-authorization.
      </p>

      <div className="flex justify-end">
        <ConnectGoogleButton />
      </div>

      <OAuthAccountsTable showConnectedToast={connected === "true"} />
    </Container>
  );
}
