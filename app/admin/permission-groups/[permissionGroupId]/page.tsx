import { notFound } from "next/navigation";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import RecordTabs from "@/components/admin/RecordTabs";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import { TabsContent } from "@/components/ui/tabs";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { getPermissionGroupById } from "@/lib/adminPermissionCatalog";
import PermissionDefinitionsTable from "../../permission-definitions/permissionDefinitionsTable";
import EditPermissionGroupForm from "./editPermissionGroupForm";
import NewPermissionGroupForm from "./newPermissionGroupForm";
import PermissionGroupActions from "./permissionGroupActions";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ permissionGroupId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    return notFound();
  }

  const permissionGroupId = (await params).permissionGroupId;
  const activeTab = (await searchParams).tab || "edit";

  if (permissionGroupId === "new") {
    return (
      <Container>
        <BreadcrumbSetter
          breadcrumbs={[
            { label: "Admin", href: "/" },
            { label: "Permission Groups", href: "/permission-groups" },
            { label: "New Group" },
          ]}
        />
        <H1>New Permission Group</H1>
        <NewPermissionGroupForm />
      </Container>
    );
  }

  const permissionGroup = await getPermissionGroupById({ permissionGroupId });

  if (!permissionGroup) {
    return notFound();
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Permission Groups", href: "/permission-groups" },
          { label: permissionGroup.name },
        ]}
      />
      <H1>{permissionGroup.name}</H1>
      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "edit",
            label: "Edit Group",
            href: `/permission-groups/${permissionGroup.id}?tab=edit`,
          },
          {
            value: "definitions",
            label: `Definitions (${permissionGroup.definitionCount ?? 0})`,
            href: `/permission-groups/${permissionGroup.id}?tab=definitions`,
          },
        ]}
        actions={
          <PermissionGroupActions permissionGroupId={permissionGroup.id} />
        }
      >
        <TabsContent value="edit">
          <EditPermissionGroupForm
            permissionGroupId={permissionGroup.id}
            keyValue={permissionGroup.key}
            name={permissionGroup.name}
            description={permissionGroup.description}
            sortOrder={permissionGroup.sortOrder}
          />
        </TabsContent>

        <TabsContent value="definitions">
          <PermissionDefinitionsTable permissionGroupId={permissionGroup.id} />
        </TabsContent>
      </RecordTabs>
    </Container>
  );
}
