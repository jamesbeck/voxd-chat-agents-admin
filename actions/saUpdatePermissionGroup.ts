"use server";

import { revalidatePath } from "next/cache";
import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { ServerActionResponse } from "@/types/types";

const saUpdatePermissionGroup = async ({
  permissionGroupId,
  key,
  name,
  description,
  sortOrder,
}: {
  permissionGroupId: string;
  key: string;
  name: string;
  description: string;
  sortOrder?: number;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    return {
      success: false,
      error: "Only super admins can update permission groups",
    };
  }

  const normalizedKey = key.trim();
  const normalizedName = name.trim();
  const normalizedDescription = description.trim();
  const normalizedSortOrder = Number.isFinite(sortOrder)
    ? Number(sortOrder)
    : 0;

  if (
    !permissionGroupId ||
    !normalizedKey ||
    !normalizedName ||
    !normalizedDescription
  ) {
    return {
      success: false,
      error: "Permission group, key, name, and description are required.",
    };
  }

  const existingGroup = await db("permissionGroup")
    .where({ id: permissionGroupId })
    .first();

  if (!existingGroup) {
    return { success: false, error: "Permission group not found." };
  }

  const conflictingGroup = await db("permissionGroup")
    .whereRaw("LOWER(key) = LOWER(?)", [normalizedKey])
    .whereNot({ id: permissionGroupId })
    .first();

  if (conflictingGroup) {
    return {
      success: false,
      error: "A permission group with this key already exists.",
    };
  }

  await db("permissionGroup").where({ id: permissionGroupId }).update({
    key: normalizedKey,
    name: normalizedName,
    description: normalizedDescription,
    sortOrder: normalizedSortOrder,
    updatedAt: db.fn.now(),
  });

  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "Permission Group Updated",
    description: `Updated permission group ${normalizedKey}`,
    data: {
      permissionGroupId,
      key: normalizedKey,
      name: normalizedName,
    },
  });

  revalidatePath("/permission-groups");
  revalidatePath(`/permission-groups/${permissionGroupId}`);

  return { success: true };
};

export default saUpdatePermissionGroup;
