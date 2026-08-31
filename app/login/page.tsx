import LoginForm from "@/components/LoginForm";
import { verifyIdToken, verifyAccessToken } from "@/lib/auth/verifyToken";
import getPartnerFromHeaders from "@/lib/getPartnerFromHeaders";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const partner = await getPartnerFromHeaders();
  const brandName = partner?.effectivePartnerName || "VOXD";

  return {
    title: `${brandName} | WhatsApp AI Chatbots`,
    description: `${brandName} | WhatsApp AI Chatbots`,
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const idToken = await verifyIdToken(false);
  const accessToken = await verifyAccessToken(false);
  const { redirectTo } = await searchParams;

  // If already logged in, redirect to admin (or the requested redirect destination)
  if (accessToken) {
    redirect(typeof redirectTo === "string" ? redirectTo : "/");
  }

  const partner = await getPartnerFromHeaders();

  // Only compute devEmail in development mode - never send to client in production
  let devEmail: string | undefined;
  if (process.env.NODE_ENV === "development") {
    const partnerDomain = process.env.DEVELOPTMENT_PARTNER_DOMAIN;
    if (
      partnerDomain === "voxd.ai" ||
      partnerDomain === "chatagents.voxd.ai"
    ) {
      devEmail = "james.beck@voxd.ai";
    } else if (partnerDomain === "portal.chatfox.ai") {
      devEmail = "james@chatfox.ai";
    }
  }

  return (
    <div
      style={
        partner?.effectivePartnerPrimaryColour
          ? ({
              "--color-primary": partner?.effectivePartnerPrimaryColour,
            } as React.CSSProperties)
          : undefined
      }
    >
      <LoginForm
        email={devEmail || idToken?.email}
        logoUrl={
          partner?.effectivePartnerLogoFileExtension &&
          partner?.effectivePartnerOrganisationId
            ? `https://s3.${process.env.NEXT_PUBLIC_WASABI_REGION || "eu-west-1"}.wasabisys.com/${process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME || "voxd"}/organisationLogos/${partner.effectivePartnerOrganisationId}.${partner.effectivePartnerLogoFileExtension}`
            : undefined
        }
        showLogoOnColour={
          partner?.effectivePartnerShowLogoOnColour ?? undefined
        }
        redirectTo={typeof redirectTo === "string" ? redirectTo : undefined}
      />
    </div>
  );
}
