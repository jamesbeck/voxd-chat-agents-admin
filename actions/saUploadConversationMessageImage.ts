"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import db from "../database/db";

const saUploadConversationMessageImage = async ({
  conversationId,
  messageIndex,
  fileBase64,
  fileExtension,
}: {
  conversationId: string;
  messageIndex: number;
  fileBase64: string;
  fileExtension: string;
}): Promise<ServerActionResponse> => {
  if (!conversationId) {
    return { success: false, error: "Conversation ID is required" };
  }

  if (!fileBase64) {
    return { success: false, error: "File data is required" };
  }

  if (!fileExtension) {
    return { success: false, error: "File extension is required" };
  }

  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin && !accessToken.partner) {
    return {
      success: false,
      error: "Only partners and super admins can upload images",
    };
  }

  const conversation = await db("exampleConversation")
    .leftJoin("quote", "exampleConversation.quoteId", "quote.id")
    .leftJoin("organisation", "quote.organisationId", "organisation.id")
    .where("exampleConversation.id", conversationId)
    .select("quote.archived", "organisation.partnerId")
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

  if (accessToken.partner && !accessToken.superAdmin) {
    if (conversation.partnerId !== accessToken.partnerId) {
      return {
        success: false,
        error: "You don't have permission to edit this conversation",
      };
    }
  }

  const allowedExtensions = ["png", "jpg", "jpeg", "gif", "webp"];
  const ext = fileExtension.toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return {
      success: false,
      error: `Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`,
    };
  }

  try {
    const buffer = Buffer.from(fileBase64, "base64");
    const bucketName = process.env.WASABI_BUCKET_NAME || "voxd";

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

    const contentTypes: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
    };

    const key = `exampleConversationImages/${conversationId}_${messageIndex}.${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ACL: "public-read",
        ContentType: contentTypes[ext] || "application/octet-stream",
      }),
    );

    const imageUrl = `https://${process.env.NEXT_PUBLIC_WASABI_ENDPOINT}/${bucketName}/${key}`;

    return { success: true, data: { imageUrl } };
  } catch (error) {
    console.error("Error uploading conversation message image:", error);
    return {
      success: false,
      error: "Failed to upload image. Please try again.",
    };
  }
};

export default saUploadConversationMessageImage;
