import React from "react";
import getWaba from "@/lib/meta/getWaba";
import saGetWabaById from "@/actions/saGetWabaById";
import PhoneNumberTable from "./phoneNumberTable";
import TemplatesTable from "./templatesTable";
import WabaInfoTab from "./wabaInfoTab";
import H1 from "@/components/adminui/H1";
import H2 from "@/components/adminui/H2";
import Container from "@/components/adminui/Container";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import { TabsContent } from "@/components/ui/tabs";
import RecordTabs from "@/components/admin/RecordTabs";
import WabaActions from "./wabaActions";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ wabaId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { wabaId } = await params;
  const activeTab = (await searchParams).tab || "info";

  const waba = await getWaba(wabaId);
  const wabaDbResult = await saGetWabaById(wabaId);
  const wabaDb = wabaDbResult.success ? wabaDbResult.data : null;

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Wabas", href: "/wabas" },
          { label: waba?.name || "WABA Details" },
        ]}
      />
      <H1>{waba?.name || "WABA Details"}</H1>

      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "info",
            label: "Info",
            href: `/wabas/${wabaId}?tab=info`,
          },
          {
            value: "phone-numbers",
            label: "Phone Numbers",
            href: `/wabas/${wabaId}?tab=phone-numbers`,
          },
          {
            value: "templates",
            label: "Templates",
            href: `/wabas/${wabaId}?tab=templates`,
          },
        ]}
        actions={<WabaActions wabaId={wabaId} />}
      >
        <TabsContent value="info">
          <Container>
            <H2>WABA Information</H2>
            <p className="text-muted-foreground mb-4">
              WhatsApp Business Account details stored in the database.
            </p>
            {wabaDb ? (
              <WabaInfoTab waba={wabaDb} />
            ) : (
              <p className="text-muted-foreground">
                Unable to load WABA information.
              </p>
            )}
          </Container>
        </TabsContent>

        <TabsContent value="phone-numbers">
          <Container>
            <H2>Phone Numbers</H2>
            <PhoneNumberTable wabaId={wabaId} />
          </Container>
        </TabsContent>

        <TabsContent value="templates">
          <Container>
            <H2>Message Templates</H2>
            <p className="text-muted-foreground mb-4">
              WhatsApp message templates registered with this WABA.
            </p>
            <TemplatesTable wabaId={wabaId} />
          </Container>
        </TabsContent>
      </RecordTabs>
    </Container>
  );
}
