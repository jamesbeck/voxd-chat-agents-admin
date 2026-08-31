"use server";

import { revalidatePath } from "next/cache";
import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { ServerActionResponse } from "@/types/types";

const normalizeScopeMode = (scopeMode: string) =>
  scopeMode.trim().toLowerCase();

const saCreatePermissionDefinition = async ({
  permissionGroupId,
  key,
  name,
  description,
  scopeMode,
  defaultValue,
  requiresSuperAdminToManage,
}: {
  permissionGroupId: string;
  key: string;
  name: string;
  description: string;
  scopeMode: string;
  defaultValue: boolean;
  requiresSuperAdminToManage: boolean;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    return {
      success: false,
      error: "Only super admins can create permission definitions",
    };
  }

  const normalizedKey = key.trim();
  const normalizedName = name.trim();
  const normalizedDescription = description.trim();
  const normalizedScopeMode = normalizeScopeMode(scopeMode);

  if (
    !permissionGroupId ||
    !normalizedKey ||
    !normalizedName ||
    !normalizedDescription
  ) {
    return {
      success: false,
      error: "Group, key, name, and description are required.",
    };
  }

  if (!["global", "agent"].includes(normalizedScopeMode)) {
    return {
      success: false,
      error: "Scope mode must be global or agent.",
    };
  }

  const permissionGroup = await db("permissionGroup")
    .where({ id: permissionGroupId })
    .first();

  if (!permissionGroup) {
    return { success: false, error: "Permission group not found." };
  }

  const existingDefinition = await db("permissionDefinition")
    .whereRaw("LOWER(key) = LOWER(?)", [normalizedKey])
    .first();

  if (existingDefinition) {
    return {
      success: false,
      error: "A permission definition with this key already exists.",
    };
  }

  const [permissionDefinition] = await db("permissionDefinition")
    .insert({
      permissionGroupId,
      key: normalizedKey,
      name: normalizedName,
      description: normalizedDescription,
      scopeMode: normalizedScopeMode,
      defaultValue,
      requiresSuperAdminToManage,
    })
    .returning(["id", "key", "name"]);

  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "Permission Definition Created",
    description: `Created permission definition ${permissionDefinition.key}`,
    data: {
      permissionDefinitionId: permissionDefinition.id,
      permissionGroupId,
      key: permissionDefinition.key,
      name: permissionDefinition.name,
      scopeMode: normalizedScopeMode,
    },
  });

  revalidatePath("/permission-definitions");
  revalidatePath(`/permission-groups/${permissionGroupId}`);

  return { success: true, data: permissionDefinition };
};

export default saCreatePermissionDefinition;
