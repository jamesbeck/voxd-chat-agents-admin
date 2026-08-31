"use server";

import { revalidatePath } from "next/cache";
import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import {
  getAdminUserPermissionsAccess,
  getScopedAgentForAdminUser,
  hasAdminUserPermission,
} from "@/lib/adminUserPermissions";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { ServerActionResponse } from "@/types/types";

const saSetAdminUserPermission = async ({
  adminUserId,
  permissionDefinitionId,
  agentId,
  value,
}: {
  adminUserId: string;
  permissionDefinitionId: string;
  agentId?: string;
  value: boolean;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  if (!adminUserId || !permissionDefinitionId) {
    return {
      success: false,
      error: "Admin user and permission definition are required.",
    };
  }

  const access = await getAdminUserPermissionsAccess({
    targetAdminUserId: adminUserId,
    accessToken,
  });

  if (!access) {
    return {
      success: false,
      error: "User not found.",
    };
  }

  if (!access.canWritePermissions) {
    return {
      success: false,
      error: "You do not have permission to manage user permissions.",
    };
  }

  const mutationResult = await db.transaction(async (trx) => {
    const permissionDefinition = await trx("permissionDefinition")
      .select(
        "id",
        "key",
        "name",
        "description",
        "scopeMode",
        "defaultValue",
        "requiresSuperAdminToManage",
      )
      .where("id", permissionDefinitionId)
      .first();

    if (!permissionDefinition) {
      return {
        success: false as const,
        error: "Permission definition not found.",
      };
    }

    if (
      permissionDefinition.requiresSuperAdminToManage &&
      !accessToken.superAdmin
    ) {
      return {
        success: false as const,
        error: "Only super admins can manage this permission.",
      };
    }

    const actorStillHasWriteAccess =
      accessToken.superAdmin ||
      (await hasAdminUserPermission({
        adminUserId: accessToken.adminUserId,
        permissionKey: "write_user_permissions",
        trx,
      }));

    if (!actorStillHasWriteAccess) {
      return {
        success: false as const,
        error: "You do not have permission to manage user permissions.",
      };
    }

    if (permissionDefinition.scopeMode === "global" && agentId) {
      return {
        success: false as const,
        error: "This permission is managed globally.",
      };
    }

    if (permissionDefinition.scopeMode === "agent" && !agentId) {
      return {
        success: false as const,
        error: "An agent is required for this permission.",
      };
    }

    if (
      permissionDefinition.scopeMode !== "global" &&
      permissionDefinition.scopeMode !== "agent"
    ) {
      return {
        success: false as const,
        error: "This permission scope is not supported for editing.",
      };
    }

    if (permissionDefinition.scopeMode === "agent") {
      const scopedAgent = await getScopedAgentForAdminUser({
        agentId: agentId!,
        targetAdminUser: access.targetUser,
        trx,
      });

      if (!scopedAgent) {
        return {
          success: false as const,
          error: "Agent not found for this user.",
        };
      }

      const existingPermission = await trx("adminUserAgentPermission")
        .select("value")
        .where({ adminUserId, permissionDefinitionId, agentId })
        .first();

      const globalPermission = await trx("adminUserPermission")
        .select("value")
        .where({ adminUserId, permissionDefinitionId })
        .first();

      const oldValue =
        globalPermission?.value ??
        existingPermission?.value ??
        permissionDefinition.defaultValue;

      await trx("adminUserAgentPermission")
        .insert({
          adminUserId,
          permissionDefinitionId,
          agentId,
          value,
        })
        .onConflict(["adminUserId", "permissionDefinitionId", "agentId"])
        .merge({
          value,
          updatedAt: trx.fn.now(),
        });

      return {
        success: true as const,
        data: {
          permissionKey: permissionDefinition.key,
          permissionName: permissionDefinition.name,
          oldValue,
          newValue: value,
          scopeMode: permissionDefinition.scopeMode,
          agentId,
        },
      };
    }

    const existingPermission = await trx("adminUserPermission")
      .select("value")
      .where({ adminUserId, permissionDefinitionId })
      .first();

    const oldValue =
      existingPermission?.value ?? permissionDefinition.defaultValue;

    await trx("adminUserPermission")
      .insert({
        adminUserId,
        permissionDefinitionId,
        value,
      })
      .onConflict(["adminUserId", "permissionDefinitionId"])
      .merge({
        value,
        updatedAt: trx.fn.now(),
      });

    return {
      success: true as const,
      data: {
        permissionKey: permissionDefinition.key,
        permissionName: permissionDefinition.name,
        oldValue,
        newValue: value,
        scopeMode: permissionDefinition.scopeMode,
      },
    };
  });

  if (!mutationResult.success) {
    return mutationResult;
  }

  await addLog({
    adminUserId: accessToken.adminUserId,
    organisationId: access.targetUser.organisationId ?? undefined,
    partnerId: access.targetUser.partnerId ?? undefined,
    event: "Admin User Permission Updated",
    description: `Updated ${mutationResult.data.permissionKey} for ${access.targetUser.name}`,
    data: {
      targetAdminUserId: access.targetUser.id,
      targetAdminUserName: access.targetUser.name,
      permissionKey: mutationResult.data.permissionKey,
      permissionName: mutationResult.data.permissionName,
      scopeMode: mutationResult.data.scopeMode,
      agentId: mutationResult.data.agentId,
      oldValue: mutationResult.data.oldValue,
      newValue: mutationResult.data.newValue,
    },
  });

  revalidatePath(`/adminUsers/${adminUserId}`);

  return {
    success: true,
    data: {
      permissionKey: mutationResult.data.permissionKey,
      permissionName: mutationResult.data.permissionName,
      value: mutationResult.data.newValue,
      agentId: mutationResult.data.agentId,
    },
  };
};

export default saSetAdminUserPermission;
