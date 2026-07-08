"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const saDeleteQuoteExampleConversation = async ({
  conversationId,
}: {
  conversationId: string;
}): Promise<ServerActionResponse> => {
  if (!conversationId) {
    return {
      success: false,
      error: "Conversation ID is required",
    };
  }

  const accessToken = await verifyAccessToken();

  // Get the conversation with quote and organisation data
  const conversation = await db("exampleConversation")
    .leftJoin("quote", "exampleConversation.quoteId", "quote.id")
    .leftJoin("organisation", "quote.organisationId", "organisation.id")
    .where("exampleConversation.id", conversationId)
    .select("exampleConversation.*", "organisation.partnerId")
    .first();

  if (!conversation) {
    return {
      success: false,
      error: "Conversation not found",
    };
  }

  if (conversation.archived) {
    return {
      success: false,
      error: "Archived quotes cannot be edited",
    };
  }

  // Check if user is super admin or the partner that owns this quote
  const isSuperAdmin = accessToken.superAdmin;
  const isOwnerPartner =
    accessToken.partner && accessToken.partnerId === conversation.partnerId;

  if (!isSuperAdmin && !isOwnerPartner) {
    return {
      success: false,
      error: "You don't have permission to delete this conversation",
    };
  }

  // Clean up any conversation images from Wasabi
  const messages = conversation.messages || [];
  const imageMessages = messages.filter(
    (msg: { imageUrl?: string }) => msg.imageUrl,
  );

  if (imageMessages.length > 0) {
    try {
      const s3Client = new S3Client({
        region: process.env.WASABI_REGION || "eu-west-1",
        endpoint: `https://s3.${
          process.env.WASABI_REGION || "eu-west-1"
        }.wasabisys.com`,
        credentials: {
          accessKeyId: process.env.WASABI_ACCESS_KEY_ID!,
          secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY!,
        },
        forcePathStyle: true,
      });

      const bucketName = process.env.WASABI_BUCKET_NAME || "voxd";

      for (const msg of imageMessages) {
        try {
          const url = new URL(msg.imageUrl);
          const key = url.pathname.replace(`/${bucketName}/`, "");
          await s3Client.send(
            new DeleteObjectCommand({ Bucket: bucketName, Key: key }),
          );
        } catch (e) {
          console.error("Error deleting conversation image:", e);
        }
      }
    } catch (e) {
      console.error("Error initializing S3 client for cleanup:", e);
    }
  }

  // Delete the conversation
  await db("exampleConversation").where({ id: conversationId }).delete();

  return { success: true };
};

export default saDeleteQuoteExampleConversation;
