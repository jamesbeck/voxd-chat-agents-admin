"use server";

import { revalidatePath } from "next/cache";
import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { ServerActionResponse } from "@/types/types";

const normalizeScopeMode = (scopeMode: string) =>
  scopeMode.trim().toLowerCase();

const saUpdatePermissionDefinition = async ({
  permissionDefinitionId,
  permissionGroupId,
  key,
  name,
  description,
  scopeMode,
  defaultValue,
  requiresSuperAdminToManage,
}: {
  permissionDefinitionId: string;
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
      error: "Only super admins can update permission definitions",
    };
  }

  const normalizedKey = key.trim();
  const normalizedName = name.trim();
  const normalizedDescription = description.trim();
  const normalizedScopeMode = normalizeScopeMode(scopeMode);

  if (
    !permissionDefinitionId ||
    !permissionGroupId ||
    !normalizedKey ||
    !normalizedName ||
    !normalizedDescription
  ) {
    return {
      success: false,
      error: "Definition, group, key, name, and description are required.",
    };
  }

  if (!["global", "agent"].includes(normalizedScopeMode)) {
    return {
      success: false,
      error: "Scope mode must be global or agent.",
    };
  }

  const permissionDefinition = await db("permissionDefinition")
    .where({ id: permissionDefinitionId })
    .first();

  if (!permissionDefinition) {
    return { success: false, error: "Permission definition not found." };
  }

  const permissionGroup = await db("permissionGroup")
    .where({ id: permissionGroupId })
    .first();

  if (!permissionGroup) {
    return { success: false, error: "Permission group not found." };
  }

  const conflictingDefinition = await db("permissionDefinition")
    .whereRaw("LOWER(key) = LOWER(?)", [normalizedKey])
    .whereNot({ id: permissionDefinitionId })
    .first();

  if (conflictingDefinition) {
    return {
      success: false,
      error: "A permission definition with this key already exists.",
    };
  }

  await db("permissionDefinition")
    .where({ id: permissionDefinitionId })
    .update({
      permissionGroupId,
      key: normalizedKey,
      name: normalizedName,
      description: normalizedDescription,
      scopeMode: normalizedScopeMode,
      defaultValue,
      requiresSuperAdminToManage,
      updatedAt: db.fn.now(),
    });

  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "Permission Definition Updated",
    description: `Updated permission definition ${normalizedKey}`,
    data: {
      permissionDefinitionId,
      permissionGroupId,
      key: normalizedKey,
      name: normalizedName,
      scopeMode: normalizedScopeMode,
    },
  });

  revalidatePath("/permission-definitions");
  revalidatePath(`/permission-definitions/${permissionDefinitionId}`);
  revalidatePath(`/permission-groups/${permissionGroupId}`);

  return { success: true };
};

export default saUpdatePermissionDefinition;
