"use server";

import { revalidatePath } from "next/cache";
import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { ServerActionResponse } from "@/types/types";

const saCreatePermissionGroup = async ({
  key,
  name,
  description,
  sortOrder,
}: {
  key: string;
  name: string;
  description: string;
  sortOrder?: number;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    return {
      success: false,
      error: "Only super admins can create permission groups",
    };
  }

  const normalizedKey = key.trim();
  const normalizedName = name.trim();
  const normalizedDescription = description.trim();
  const normalizedSortOrder = Number.isFinite(sortOrder)
    ? Number(sortOrder)
    : 0;

  if (!normalizedKey || !normalizedName || !normalizedDescription) {
    return {
      success: false,
      error: "Key, name, and description are required.",
    };
  }

  const existingGroup = await db("permissionGroup")
    .whereRaw("LOWER(key) = LOWER(?)", [normalizedKey])
    .first();

  if (existingGroup) {
    return {
      success: false,
      error: "A permission group with this key already exists.",
    };
  }

  const [permissionGroup] = await db("permissionGroup")
    .insert({
      key: normalizedKey,
      name: normalizedName,
      description: normalizedDescription,
      sortOrder: normalizedSortOrder,
    })
    .returning(["id", "key", "name"]);

  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "Permission Group Created",
    description: `Created permission group ${permissionGroup.key}`,
    data: {
      permissionGroupId: permissionGroup.id,
      key: permissionGroup.key,
      name: permissionGroup.name,
    },
  });

  revalidatePath("/permission-groups");

  return { success: true, data: permissionGroup };
};

export default saCreatePermissionGroup;
