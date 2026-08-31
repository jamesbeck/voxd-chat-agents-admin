import { NextRequest, NextResponse } from "next/server";
import db from "@/database/db";
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
  encryptToken,
} from "@/lib/oauth/googleOAuth";
import { addLog } from "@/lib/addLog";
import getPartners from "@/lib/getPartners";
import { getGoogleCredentialsByAdminUserId } from "@/lib/getOrganisationGoogleCredentials";
import { Partner } from "@/types/types";

/**
 * Validate that a domain is a known partner domain to prevent open redirects
 */
function isValidPartnerDomain(partners: Partner[], domain: string): boolean {
  return partners.some((p) => p.domain === domain);
}

/**
 * Get the redirect base URL, using origin domain from OAuth state if valid
 */
function getRedirectBaseUrl(
  partners: Partner[],
  originDomain: string | null | undefined,
): string {
  const fallbackUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (originDomain && isValidPartnerDomain(partners, originDomain)) {
    // Use https for production partner domains
    return `https://${originDomain}`;
  }

  return fallbackUrl;
}

export async function GET(request: NextRequest) {
  const partners = await getPartners();
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Default fallback URL - will be updated once we have state info
  const fallbackUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Helper to get redirect URLs based on origin domain
  const getRedirectUrls = (originDomain: string | null | undefined) => {
    const baseUrl = getRedirectBaseUrl(partners, originDomain);
    return {
      errorPageUrl: `${baseUrl}/oauth-accounts/error`,
      successUrl: `${baseUrl}/oauth-accounts`,
    };
  };

  // For errors before we have state, try to look up state to get origin domain
  // Handle OAuth errors from Google
  if (error) {
    const errorDescription = searchParams.get("error_description") || error;
    console.error("Google OAuth error:", error, errorDescription);

    // Try to get origin domain from state if available
    let originDomain: string | null = null;
    if (state) {
      const oauthStateRecord = await db("oauthState").where({ state }).first();
      originDomain = oauthStateRecord?.metadata?.originDomain || null;
      // Clean up the state record
      if (oauthStateRecord) {
        await db("oauthState").where({ id: oauthStateRecord.id }).delete();
      }
    }

    const { errorPageUrl } = getRedirectUrls(originDomain);
    return NextResponse.redirect(
      `${errorPageUrl}?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("Missing code or state parameter");
    const { errorPageUrl } = getRedirectUrls(null);
    return NextResponse.redirect(
      `${errorPageUrl}?error=${encodeURIComponent("Missing authorization code or state")}`,
    );
  }

  try {
    // Look up the state in the database
    const oauthState = await db("oauthState")
      .where({ state })
      .where("expiresAt", ">", new Date())
      .first();

    if (!oauthState) {
      console.error("Invalid or expired state:", state);
      const { errorPageUrl } = getRedirectUrls(null);
      return NextResponse.redirect(
        `${errorPageUrl}?error=${encodeURIComponent("Invalid or expired authorization state. Please try again.")}`,
      );
    }

    // Extract origin domain from metadata for cross-domain redirect
    const originDomain: string | null =
      oauthState.metadata?.originDomain || null;
    const { errorPageUrl, successUrl } = getRedirectUrls(originDomain);

    const { adminUserId, provider, scopes, redirectUri } = oauthState;

    // Get Google OAuth credentials from the user's organisation
    const credentials = await getGoogleCredentialsByAdminUserId(adminUserId);

    // Exchange the code for tokens (must use same redirectUri that was sent to Google)
    const tokenResponse = await exchangeCodeForTokens(
      code,
      credentials,
      redirectUri,
    );

    // Get user info from Google
    const userInfo = await getGoogleUserInfo(tokenResponse.access_token);

    // Calculate token expiry
    const accessTokenExpiresAt = new Date(
      Date.now() + tokenResponse.expires_in * 1000,
    );

    // Check if this account is already connected
    const existingAccount = await db("oauthAccount")
      .where({
        adminUserId,
        provider,
        providerUserId: userInfo.id,
      })
      .first();

    if (existingAccount) {
      // Update existing account
      await db("oauthAccount")
        .where({ id: existingAccount.id })
        .update({
          email: userInfo.email,
          scopes: tokenResponse.scope,
          accessTokenEncrypted: encryptToken(tokenResponse.access_token),
          accessTokenExpiresAt,
          tokenType: tokenResponse.token_type,
          status: "active",
          updatedAt: new Date(),
          revokedAt: null,
          // Only update refresh token if a new one was provided
          ...(tokenResponse.refresh_token && {
            refreshTokenEncrypted: encryptToken(tokenResponse.refresh_token),
          }),
        });

      await addLog({
        adminUserId,
        event: "OAuth Account Reconnected",
        description: `Reconnected ${provider} account (${userInfo.email})`,
        data: {
          oauthAccountId: existingAccount.id,
          provider,
          email: userInfo.email,
        },
      });
    } else {
      // Create new OAuth account
      const [newAccount] = await db("oauthAccount")
        .insert({
          adminUserId,
          provider,
          providerUserId: userInfo.id,
          email: userInfo.email,
          scopes: tokenResponse.scope,
          accessTokenEncrypted: encryptToken(tokenResponse.access_token),
          accessTokenExpiresAt,
          refreshTokenEncrypted: tokenResponse.refresh_token
            ? encryptToken(tokenResponse.refresh_token)
            : null,
          tokenType: tokenResponse.token_type,
          status: "active",
        })
        .returning("id");

      await addLog({
        adminUserId,
        event: "OAuth Account Connected",
        description: `Connected ${provider} account (${userInfo.email})`,
        data: {
          oauthAccountId: newAccount.id,
          provider,
          email: userInfo.email,
        },
      });
    }

    // Clean up the state record
    await db("oauthState").where({ id: oauthState.id }).delete();

    // Redirect to success page
    return NextResponse.redirect(`${successUrl}?connected=true`);
  } catch (err) {
    console.error("Error in OAuth callback:", err);
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred";

    // For catch block errors, we don't have access to originDomain from state
    // Fall back to default URL
    const catchErrorUrl = `${fallbackUrl}/oauth-accounts/error`;
    return NextResponse.redirect(
      `${catchErrorUrl}?error=${encodeURIComponent(errorMessage)}`,
    );
  }
}
