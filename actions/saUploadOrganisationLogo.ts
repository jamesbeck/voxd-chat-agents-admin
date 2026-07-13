"use server";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { addLog } from "@/lib/addLog";
import sharp from "sharp";
import { createQuoteOgWithLogo } from "@/lib/createQuoteOgWithLogo";
import { extractProminentColour } from "@/lib/extractProminentColour";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";

const saUploadOrganisationLogo = async ({
  organisationId,
  fileBase64,
  fileExtension,
}: {
  organisationId: string;
  fileBase64: string;
  fileExtension: string;
}): Promise<ServerActionResponse> => {
  if (!organisationId) {
    return {
      success: false,
      error: "Organisation ID is required",
    };
  }

  if (!fileBase64) {
    return {
      success: false,
      error: "File data is required",
    };
  }

  if (!fileExtension) {
    return {
      success: false,
      error: "File extension is required",
    };
  }

  const accessToken = await verifyAccessToken();

  // Get the organisation
  const organisation = await db("organisation")
    .where("id", organisationId)
    .first();

  if (!organisation) {
    return {
      success: false,
      error: "Organisation not found",
    };
  }

  // Authorization check: must be super admin, partner of this org, or member
  const isSuperAdmin = accessToken.superAdmin;
  const isPartnerOfOrg =
    accessToken.partnerId && organisation.partnerId === accessToken.partnerId;
  const isMemberOfOrg = accessToken.organisationId === organisation.id;

  if (!isSuperAdmin && !isPartnerOfOrg && !isMemberOfOrg) {
    return {
      success: false,
      error: "You do not have permission to upload logos for this organisation",
    };
  }

  // Validate file extension
  const allowedExtensions = ["png", "jpg", "jpeg", "gif", "svg", "webp"];
  const ext = fileExtension.toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return {
      success: false,
      error: `Invalid file type. Allowed types: ${allowedExtensions.join(
        ", ",
      )}`,
    };
  }

  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(fileBase64, "base64");

    // Analyze image to determine if it needs a dark background
    const needsDarkBackground = await analyzeLogoBackground(buffer);

    // Extract prominent colour for auto-setting primary colour
    const prominentColour = await extractProminentColour(buffer, ext);

    const bucketName = process.env.WASABI_BUCKET_NAME || "voxd";

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
    const key = `organisationLogos/${organisationId}.${ext}`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ACL: "public-read",
        ContentType: getContentType(ext),
        CacheControl: "public, max-age=31536000",
      }),
    );

    // Update the organisation record with the logo extension
    const updateData: Record<string, any> = {
      logoFileExtension: ext,
      showLogoOnColour: needsDarkBackground ? "#333333" : null,
    };

    // Auto-set primary colour only if the org doesn't already have one
    if (prominentColour && !organisation.primaryColour) {
      updateData.primaryColour = prominentColour;
    }

    await db("organisation").where("id", organisationId).update(updateData);

    // Partner branding is cached for domain-based layout rendering. Expire it
    // now so router.refresh() can update the current user's sidebar immediately.
    revalidateTag("partners", { expire: 0 });
    const cookieStore = await cookies();
    cookieStore.set("partner-branding-version", Date.now().toString(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });

    // Regenerate OG images for all quotes belonging to this organisation
    const allQuotes = await db("quote")
      .where("organisationId", organisationId)
      .select("id", "heroImageFileExtension");

    if (allQuotes.length > 0) {
      const s3ClientForOg = new S3Client({
        region: process.env.WASABI_REGION || "eu-west-1",
        endpoint: `https://s3.${process.env.WASABI_REGION || "eu-west-1"}.wasabisys.com`,
        credentials: {
          accessKeyId: process.env.WASABI_ACCESS_KEY_ID!,
          secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY!,
        },
        forcePathStyle: true,
      });

      // Process in background - don't block the response
      Promise.all(
        allQuotes.map(async (quote) => {
          try {
            let heroBuffer: Buffer | null = null;

            // Only fetch hero image if it exists
            if (quote.heroImageFileExtension) {
              const heroKey = `quoteImages/${quote.id}.${quote.heroImageFileExtension}`;
              try {
                const heroResponse = await s3ClientForOg.send(
                  new GetObjectCommand({
                    Bucket: bucketName,
                    Key: heroKey,
                  }),
                );

                if (heroResponse.Body) {
                  const heroArrayBuffer =
                    await heroResponse.Body.transformToByteArray();
                  heroBuffer = Buffer.from(heroArrayBuffer);
                }
              } catch {
                // Hero image not found, continue without it
              }
            }

            await createQuoteOgWithLogo({
              quoteId: quote.id,
              heroImageBuffer: heroBuffer,
              organisationId,
              organisationLogoFileExtension: ext,
              organisationShowLogoOnColour: needsDarkBackground
                ? "#333333"
                : null,
            });
          } catch (err) {
            console.error(
              `Failed to regenerate OG image for quote ${quote.id}:`,
              err,
            );
          }
        }),
      ).catch((err) => {
        console.error("Error regenerating OG images:", err);
      });
    }

    await addLog({
      adminUserId: accessToken.adminUserId,
      organisationId,
      event: "ORGANISATION_LOGO_UPLOADED",
      data: {
        organisationId,
        fileExtension: ext,
      },
    });

    return {
      success: true,
      data: {
        primaryColour: !organisation.primaryColour ? prominentColour : null,
      },
    };
  } catch (error) {
    console.error("Error uploading logo:", error);
    return {
      success: false,
      error: "Failed to upload logo. Please try again.",
    };
  }
};

function getContentType(ext: string): string {
  const contentTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
  };
  return contentTypes[ext] || "application/octet-stream";
}

/**
 * Analyzes a logo image to determine if it should be displayed on a dark background.
 *
 * Strategy:
 * 1. For images with transparency: analyze the average brightness of non-transparent pixels
 *    - If mostly light/white pixels, it needs a dark background
 * 2. For images without transparency: analyze the edge pixels (likely background)
 *    - If edges are very light, the logo content is probably dark (light bg OK)
 *    - If edges are dark or image has no clear background, analyze overall brightness
 */
async function analyzeLogoBackground(buffer: Buffer): Promise<boolean> {
  try {
    // SVGs are tricky - default to analyzing them as rasterized
    // Sharp can handle SVG but we need to be careful

    const image = sharp(buffer);

    // Resize to a small size for faster analysis (50x50 is enough for color detection)
    const resized = image.resize(50, 50, { fit: "inside" });

    // Get raw pixel data with alpha channel
    const { data, info } = await resized
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const hasAlpha = info.channels === 4;
    const pixels = info.width * info.height;

    let totalBrightness = 0;
    let visiblePixels = 0;
    let transparentPixels = 0;
    let lightPixels = 0; // Pixels with brightness > 200
    let veryLightPixels = 0; // Pixels with brightness > 240 (nearly white)

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = hasAlpha ? data[i + 3] : 255;

      // Skip fully transparent pixels
      if (a < 10) {
        transparentPixels++;
        continue;
      }

      // Calculate perceived brightness (human eye is more sensitive to green)
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      // Weight by alpha (semi-transparent pixels count less)
      const weight = a / 255;
      totalBrightness += brightness * weight;
      visiblePixels += weight;

      if (brightness > 200) lightPixels++;
      if (brightness > 240) veryLightPixels++;
    }

    // If no visible pixels, default to light background
    if (visiblePixels < 1) {
      return false;
    }

    const avgBrightness = totalBrightness / visiblePixels;
    const transparencyRatio = transparentPixels / pixels;
    const lightPixelRatio = lightPixels / (pixels - transparentPixels);
    const veryLightPixelRatio = veryLightPixels / (pixels - transparentPixels);

    // If image has a solid background (very low transparency), we never need
    // to add our own background - the logo already has one
    if (transparencyRatio < 0.05) {
      return false;
    }

    // From here, we know the image has transparency, so we need to determine
    // if the visible (non-transparent) pixels are light and need a dark bg

    // 1. If visible pixels are predominantly light, it needs dark background
    if (avgBrightness > 180 || veryLightPixelRatio > 0.3) {
      return true; // Light logo on transparent bg - needs dark background
    }

    // 2. If most visible pixels are very light (>240), needs dark background
    if (veryLightPixelRatio > 0.4) {
      return true;
    }

    // 3. If average brightness is very high, needs dark background
    if (avgBrightness > 200) {
      return true;
    }

    // 4. If a significant portion is light, lean towards dark background
    if (lightPixelRatio > 0.5 && avgBrightness > 150) {
      return true;
    }

    // Default: light background is fine
    return false;
  } catch (error) {
    console.error("Error analyzing logo:", error);
    // Default to light background on error
    return false;
  }
}

export default saUploadOrganisationLogo;
