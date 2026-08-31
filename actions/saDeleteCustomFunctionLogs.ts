"use server";

import { revalidatePath } from "next/cache";
import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { ServerActionResponse } from "@/types/types";

const saDeleteCustomFunctionLogs = async ({
  customFunctionId,
}: {
  customFunctionId: string;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    return {
      success: false,
      error: "Only super admins can delete custom function logs",
    };
  }

  if (!customFunctionId) {
    return {
      success: false,
      error: "Custom function ID is required.",
    };
  }

  const customFunction = await db("customFunction")
    .select("id", "agentId", "key", "niceName")
    .where("id", customFunctionId)
    .whereNull("archivedAt")
    .first();

  if (!customFunction) {
    return {
      success: false,
      error: "Custom function not found.",
    };
  }

  const runCountResult = await db("customFunctionRun")
    .where("customFunctionId", customFunctionId)
    .count<{ count: string }>("id as count")
    .first();

  const deletedRunCount = Number.parseInt(runCountResult?.count || "0", 10);

  // customFunctionRunLog rows are deleted via ON DELETE CASCADE.
  await db("customFunctionRun")
    .where("customFunctionId", customFunctionId)
    .delete();

  await addLog({
    adminUserId: accessToken.adminUserId,
    agentId: customFunction.agentId,
    event: "Custom Function Logs Deleted",
    description: `Deleted ${deletedRunCount} run logs for custom function ${customFunction.key}`,
    data: {
      customFunctionId,
      customFunctionKey: customFunction.key,
      customFunctionName: customFunction.niceName,
      deletedRunCount,
    },
  });

  revalidatePath("/custom-function-runs");
  revalidatePath("/custom-functions");
  revalidatePath(`/custom-functions/${customFunctionId}`);

  return {
    success: true,
    data: {
      deletedRunCount,
    },
  };
};

export default saDeleteCustomFunctionLogs;
