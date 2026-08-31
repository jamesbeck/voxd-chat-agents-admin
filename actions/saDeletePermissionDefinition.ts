"use server";

import { revalidatePath } from "next/cache";
import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { ServerActionResponse } from "@/types/types";

const saDeletePermissionDefinition = async ({
  permissionDefinitionId,
}: {
  permissionDefinitionId: string;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    return {
      success: false,
      error: "Only super admins can delete permission definitions",
    };
  }

  const permissionDefinition = await db("permissionDefinition")
    .where({ id: permissionDefinitionId })
    .first();

  if (!permissionDefinition) {
    return { success: false, error: "Permission definition not found." };
  }

  const [globalAssignment, agentAssignment] = await Promise.all([
    db("adminUserPermission").where({ permissionDefinitionId }).first(),
    db("adminUserAgentPermission").where({ permissionDefinitionId }).first(),
  ]);

  if (globalAssignment || agentAssignment) {
    return {
      success: false,
      error:
        "This definition still has permission assignments. Remove those first.",
    };
  }

  await db("permissionDefinition")
    .where({ id: permissionDefinitionId })
    .delete();

  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "Permission Definition Deleted",
    description: `Deleted permission definition ${permissionDefinition.key}`,
    data: {
      permissionDefinitionId,
      permissionGroupId: permissionDefinition.permissionGroupId,
      key: permissionDefinition.key,
      name: permissionDefinition.name,
      scopeMode: permissionDefinition.scopeMode,
    },
  });

  revalidatePath("/permission-definitions");
  revalidatePath(
    `/permission-groups/${permissionDefinition.permissionGroupId}`,
  );

  return { success: true };
};

export default saDeletePermissionDefinition;
