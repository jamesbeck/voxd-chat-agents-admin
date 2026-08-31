import db from "@/database/db";

// Fallback organisation for Google OAuth credentials when an org doesn't have its own
const FALLBACK_GOOGLE_CREDENTIALS_ORG_ID =
  "019bbc67-4206-7902-9d37-491bd81f4eab";
export const FALLBACK_CALLBACK_DOMAIN = "chatagents.voxd.ai";

export interface GoogleOAuthCredentials {
  clientId: string;
  clientSecret: string;
  isFallback: boolean;
}

/**
 * Get Google OAuth credentials for an organisation.
 * If the organisation doesn't have credentials configured, falls back to
 * the default Voxd organisation's credentials.
 */
export async function getOrganisationGoogleCredentials(
  organisationId: string,
): Promise<GoogleOAuthCredentials> {
  const organisation = await db("organisation")
    .where({ id: organisationId })
    .select("googleClientId", "googleClientSecret")
    .first();

  if (!organisation) {
    throw new Error("Organisation not found");
  }

  if (organisation.googleClientId && organisation.googleClientSecret) {
    return {
      clientId: organisation.googleClientId,
      clientSecret: organisation.googleClientSecret,
      isFallback: false,
    };
  }

  // Fall back to the default Voxd organisation's credentials
  if (organisationId !== FALLBACK_GOOGLE_CREDENTIALS_ORG_ID) {
    const fallbackOrg = await db("organisation")
      .where({ id: FALLBACK_GOOGLE_CREDENTIALS_ORG_ID })
      .select("googleClientId", "googleClientSecret")
      .first();

    if (fallbackOrg?.googleClientId && fallbackOrg?.googleClientSecret) {
      return {
        clientId: fallbackOrg.googleClientId,
        clientSecret: fallbackOrg.googleClientSecret,
        isFallback: true,
      };
    }
  }

  throw new Error(
    "Google OAuth credentials are not configured for this organisation",
  );
}

/**
 * Get Google OAuth credentials for an admin user by looking up their organisation
 */
export async function getGoogleCredentialsByAdminUserId(
  adminUserId: string,
): Promise<GoogleOAuthCredentials> {
  const adminUser = await db("adminUser")
    .where({ id: adminUserId })
    .select("organisationId")
    .first();

  if (!adminUser) {
    throw new Error("Admin user not found");
  }

  if (!adminUser.organisationId) {
    throw new Error("Admin user does not belong to an organisation");
  }

  return getOrganisationGoogleCredentials(adminUser.organisationId);
}
