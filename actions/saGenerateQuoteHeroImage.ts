"use server";

import { experimental_generateImage as generateImage, generateText } from "ai";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { addLog } from "@/lib/addLog";
import { createQuoteOgWithLogo } from "@/lib/createQuoteOgWithLogo";
import {
  getAdminAiImageModel,
  getAdminAiLanguageModel,
  getAdminAiModelId,
} from "@/lib/adminAi";

const saGenerateQuoteHeroImage = async ({
  quoteId,
  userPrompt,
}: {
  quoteId: string;
  userPrompt?: string;
}): Promise<ServerActionResponse> => {
  if (!quoteId) {
    return {
      success: false,
      error: "Quote ID is required",
    };
  }

  const accessToken = await verifyAccessToken();

  // Only partners and super admins can generate hero images
  if (!accessToken.superAdmin && !accessToken.partner) {
    return {
      success: false,
      error: "Only partners and super admins can generate hero images",
    };
  }

  // Get the quote with organisation and partner details
  const quote = await db("quote")
    .where("quote.id", quoteId)
    .join("organisation", "quote.organisationId", "organisation.id")
    .select(
      "quote.*",
      "organisation.id as organisationId",
      "organisation.name as organisationName",
      "organisation.partnerId",
      "organisation.logoFileExtension as organisationLogoFileExtension",
      db.raw(
        'organisation."showLogoOnColour" as "organisationShowLogoOnColour"',
      ),
    )
    .first();

  if (!quote) {
    return {
      success: false,
      error: "Quote not found",
    };
  }

  if (quote.archived) {
    return {
      success: false,
      error: "Archived quotes cannot be edited",
    };
  }

  // Partners can only generate hero images for their own quotes
  if (accessToken.partner && !accessToken.superAdmin) {
    if (quote.partnerId !== accessToken.partnerId) {
      return {
        success: false,
        error: "You can only generate hero images for your own quotes",
      };
    }
  }

  // Get the partner's provider API key
  let providerApiKey: string | null = null;
  let providerName: string | null = null;

  if (quote.partnerId) {
    const partner = await db("organisation")
      .leftJoin(
        "providerApiKey",
        "organisation.providerApiKeyId",
        "providerApiKey.id",
      )
      .leftJoin("provider", "providerApiKey.providerId", "provider.id")
      .where("organisation.id", quote.partnerId)
      .select(
        db.raw('"providerApiKey"."key" as "providerApiKey"'),
        "provider.name as providerName",
      )
      .first();
    providerApiKey = partner?.providerApiKey || null;
    providerName = partner?.providerName || null;
  }

  if (!providerApiKey || !providerName) {
    return {
      success: false,
      error:
        "Your partner account does not have a provider API key configured. Please contact an administrator.",
    };
  }

  try {
    // Step 1: Generate hero image prompt using the partner's configured text model
    const promptGenerationResult = await generateText({
      model: getAdminAiLanguageModel({
        providerName,
        apiKey: providerApiKey,
      }),
      prompt: `Create a short prompt for generating a hero image.

Organisation: ${quote.organisationName || "the organisation"}
Background: ${quote.background?.substring(0, 200) || "No description"}
${userPrompt ? `Style: ${userPrompt}` : ""}

Write a brief hero image prompt (max 2 sentences) for a professional website banner. Focus on visual atmosphere and industry context.`,
    });

    const heroPrompt = promptGenerationResult.text.trim();

    // Add landscape and professional styling
    const finalPrompt = `Professional hero banner image for ${
      quote.organisationName || "the organisation"
    }. ${heroPrompt}. Landscape format, professional photography style, clean composition.  Avoid including any text or people in the image.`;

    console.log("Generated hero image prompt:", finalPrompt);

    // Step 2: Generate the hero image using the provider-aware image model
    const result = await generateImage({
      model: getAdminAiImageModel({
        providerName,
        apiKey: providerApiKey,
      }),
      prompt: finalPrompt,
    });

    // Step 3: Upload to Wasabi
    const buffer = Buffer.from(result.image.uint8Array);
    const bucketName = process.env.WASABI_BUCKET_NAME || "voxd";
    const fileExtension = "webp";

    // Initialize S3 client for Wasabi
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

    // Upload to Wasabi
    const key = `quoteImages/${quoteId}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: "image/webp",
      ACL: "public-read",
    });

    await s3Client.send(command);

    // Step 3b: Create optimized OG version (1200x630, <600KB for WhatsApp)
    const ogBuffer = await sharp(buffer)
      .resize(1200, 630, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 80 })
      .toBuffer();

    const ogKey = `quoteImages/${quoteId}_og.${fileExtension}`;

    const ogCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: ogKey,
      Body: ogBuffer,
      ContentType: "image/webp",
      ACL: "public-read",
    });

    await s3Client.send(ogCommand);

    // Step 3c: Create OG image with organisation logo overlay (stored separately)
    await createQuoteOgWithLogo({
      quoteId,
      heroImageBuffer: buffer,
      organisationId: quote.organisationId,
      organisationLogoFileExtension: quote.organisationLogoFileExtension,
      organisationShowLogoOnColour: quote.organisationShowLogoOnColour,
    });

    // Step 4: Update database
    await db("quote").where("id", quoteId).update({
      heroImageFileExtension: fileExtension,
    });

    // Step 5: Log the action
    await addLog({
      adminUserId: accessToken.adminUserId,
      partnerId: quote.partnerId,
      event: "Hero Image Generated",
      description: `Generated hero image for quote "${quote.title}"`,
      data: {
        quoteId,
        organisationName: quote.organisationName,
        generatedPrompt: finalPrompt,
        userPrompt: userPrompt || null,
        model: getAdminAiModelId({
          providerName,
          taskType: "image",
        }),
      },
    });

    return {
      success: true,
      data: {
        url: `https://${process.env.NEXT_PUBLIC_WASABI_ENDPOINT}/${bucketName}/${key}`,
        prompt: finalPrompt,
      },
    };
  } catch (error) {
    console.error("Error generating hero image:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while generating the hero image",
    };
  }
};

export default saGenerateQuoteHeroImage;
