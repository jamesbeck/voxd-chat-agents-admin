"use server";

import { revalidatePath } from "next/cache";
import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { ServerActionResponse } from "@/types/types";

const saUpdateCustomFunctionSchedule = async ({
  customFunctionId,
  scheduleCron,
}: {
  customFunctionId: string;
  scheduleCron?: string;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    return {
      success: false,
      error: "Only super admins can update custom function schedules",
    };
  }

  if (!customFunctionId) {
    return {
      success: false,
      error: "Custom function ID is required.",
    };
  }

  const customFunction = await db("customFunction")
    .select("id", "key", "niceName")
    .where("id", customFunctionId)
    .whereNull("archivedAt")
    .first();

  if (!customFunction) {
    return {
      success: false,
      error: "Custom function not found.",
    };
  }

  const normalizedScheduleCron = scheduleCron?.trim() || null;

  if (normalizedScheduleCron && normalizedScheduleCron.length > 255) {
    return {
      success: false,
      error: "Schedule cron must be 255 characters or fewer.",
    };
  }

  await db("customFunction").where("id", customFunctionId).update({
    scheduleCron: normalizedScheduleCron,
    updatedAt: db.fn.now(),
  });

  await addLog({
    adminUserId: accessToken.adminUserId,
    event: "Custom Function Schedule Updated",
    description: `Updated schedule for custom function ${customFunction.key}`,
    data: {
      customFunctionId,
      customFunctionKey: customFunction.key,
      customFunctionName: customFunction.niceName,
      scheduleCron: normalizedScheduleCron,
    },
  });

  revalidatePath("/custom-functions");
  revalidatePath(`/custom-functions/${customFunctionId}`);

  return { success: true };
};

export default saUpdateCustomFunctionSchedule;
