import H1 from "@/components/adminui/H1";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import SupportTicketsTable from "./supportTicketsTable";
import { Flag, Info } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import RecordTabs from "@/components/admin/RecordTabs";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import SupportTicketsActions from "./supportTicketsActions";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const activeTab = (await searchParams).tab || "open";
  const accessToken = await verifyAccessToken();

  // Determine the label for the awaiting tab
  const awaitingLabel =
    !accessToken.partner &&
    !accessToken.superAdmin &&
    accessToken.organisationName
      ? `Waiting on ${accessToken.organisationName}`
      : "Waiting on Client";

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Support Tickets" },
        ]}
      />
      <H1>Support Tickets</H1>

      <RecordTabs
        value={activeTab}
        className="space-y-4"
        tabs={[
          {
            value: "open",
            label: "Open Tickets",
            href: "/support-tickets?tab=open",
          },
          {
            value: "awaiting",
            label: awaitingLabel,
            href: "/support-tickets?tab=awaiting",
          },
          {
            value: "closed",
            label: "Closed Tickets",
            href: "/support-tickets?tab=closed",
          },
          {
            value: "backlog",
            label: "Back Log",
            href: "/support-tickets?tab=backlog",
          },
        ]}
        actions={<SupportTicketsActions />}
      >
        <TabsContent value="open">
          <SupportTicketsTable statusFilter="open" />
        </TabsContent>

        <TabsContent value="awaiting">
          <SupportTicketsTable statusFilter="awaiting" />
        </TabsContent>

        <TabsContent value="closed">
          <SupportTicketsTable statusFilter="closed" />
        </TabsContent>

        <TabsContent value="backlog">
          <SupportTicketsTable statusFilter="backlog" />
        </TabsContent>
      </RecordTabs>
    </Container>
  );
}
