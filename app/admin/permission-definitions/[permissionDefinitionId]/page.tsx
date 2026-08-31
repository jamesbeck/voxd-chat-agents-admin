import { notFound } from "next/navigation";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import RecordTabs from "@/components/admin/RecordTabs";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import {
  getPermissionDefinitionById,
  getPermissionGroupOptions,
} from "@/lib/adminPermissionCatalog";
import EditPermissionDefinitionForm from "./editPermissionDefinitionForm";
import NewPermissionDefinitionForm from "./newPermissionDefinitionForm";
import PermissionDefinitionActions from "./permissionDefinitionActions";
import PermissionDefinitionAdminUsersTab from "./PermissionDefinitionAdminUsersTab";

const renderScopeBadge = (scopeMode: string) => {
  return scopeMode === "agent" ? (
    <Badge className="bg-amber-500 text-white border-transparent">Agent</Badge>
  ) : (
    <Badge variant="secondary">Global</Badge>
  );
};

export default async function Page({
  params,
  searchParams,
}: {
  params: { permissionDefinitionId: string };
  searchParams: { tab?: string };
}) {
  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    return notFound();
  }

  const permissionDefinitionId = (await params).permissionDefinitionId;
  const activeTab = (await searchParams).tab || "edit";
  const permissionGroups = await getPermissionGroupOptions();

  if (permissionDefinitionId === "new") {
    return (
      <Container>
        <BreadcrumbSetter
          breadcrumbs={[
            { label: "Admin", href: "/" },
            {
              label: "Permission Definitions",
              href: "/permission-definitions",
            },
            { label: "New Definition" },
          ]}
        />
        <H1>New Permission Definition</H1>
        <NewPermissionDefinitionForm permissionGroups={permissionGroups} />
      </Container>
    );
  }

  const permissionDefinition = await getPermissionDefinitionById({
    permissionDefinitionId,
  });

  if (!permissionDefinition) {
    return notFound();
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          {
            label: "Permission Definitions",
            href: "/permission-definitions",
          },
          { label: permissionDefinition.name },
        ]}
      />
      <H1>
        <span className="inline-flex items-center gap-3">
          <span>{permissionDefinition.name}</span>
          {renderScopeBadge(permissionDefinition.scopeMode)}
        </span>
      </H1>
      <RecordTabs
        value={activeTab}
        tabs={[
          {
            value: "edit",
            label: "Edit Definition",
            href: `/permission-definitions/${permissionDefinition.id}?tab=edit`,
          },
          {
            value: "adminUsers",
            label: "Admin Users",
            href: `/permission-definitions/${permissionDefinition.id}?tab=adminUsers`,
          },
        ]}
        actions={
          <PermissionDefinitionActions
            permissionDefinitionId={permissionDefinition.id}
          />
        }
      >
        <TabsContent value="edit">
          <EditPermissionDefinitionForm
            permissionDefinitionId={permissionDefinition.id}
            permissionGroups={permissionGroups}
            permissionGroupId={permissionDefinition.permissionGroupId}
            keyValue={permissionDefinition.key}
            name={permissionDefinition.name}
            description={permissionDefinition.description}
            scopeMode={
              permissionDefinition.scopeMode === "agent" ? "agent" : "global"
            }
            defaultValue={permissionDefinition.defaultValue}
            requiresSuperAdminToManage={
              permissionDefinition.requiresSuperAdminToManage
            }
          />
        </TabsContent>

        <TabsContent value="adminUsers">
          <PermissionDefinitionAdminUsersTab
            permissionDefinitionId={permissionDefinition.id}
            scopeMode={permissionDefinition.scopeMode}
          />
        </TabsContent>
      </RecordTabs>
    </Container>
  );
}
