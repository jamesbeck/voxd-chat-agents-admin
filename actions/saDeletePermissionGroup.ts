"use server";

import { revalidatePath } from "next/cache";
import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { ServerActionResponse } from "@/types/types";

const saDeletePermissionGroup = async ({
  permissionGroupId,
}: {
  permissionGroupId: string;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    return {
      success: false,
      error: "Only super admins can delete permission groups",
    };
  }

  const permissionGroup = await db("permissionGroup")
    .where({ id: permissionGroupId })
    .first();

  if (!permissionGroup) {
    return { success: false, error: "Permission group not found." };
  }

  const definition = await db("permissionDefinition")
    .where({ permissionGroupId })
    .first();

  if (definition) {
    return {
      success: false,
      error:
        "This group still has permission definitions. Move or delete them first.",
    };
  }

  await db("permissionGroup").where({ id: permissionGroupId }).delete();

  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "Permission Group Deleted",
    description: `Deleted permission group ${permissionGroup.key}`,
    data: {
      permissionGroupId,
      key: permissionGroup.key,
      name: permissionGroup.name,
    },
  });

  revalidatePath("/permission-groups");

  return { success: true };
};

export default saDeletePermissionGroup;
