import { notFound } from "next/navigation";
import type { Metadata } from "next";
import saGetPrototypeData from "@/actions/saGetPrototypeData";
import DemoWebsite from "@/components/DemoWebsite";
import ChatEmbed from "@/components/ChatEmbed";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shortLinkId: string }>;
}): Promise<Metadata> {
  const shortLinkId = (await params).shortLinkId;
  const data = await saGetPrototypeData({ shortLinkId });

  if (!data) return { title: "Prototype Not Found" };

  const orgName = data.organisationName;

  return {
    title: `${orgName} – AI Chat Prototype`,
    description: `Interactive AI chat prototype for ${orgName}. Try the conversational assistant and see how it works.`,
  };
}

export default async function PrototypePage({
  params,
}: {
  params: Promise<{ shortLinkId: string }>;
}) {
  const shortLinkId = (await params).shortLinkId;
  const data = await saGetPrototypeData({ shortLinkId });

  if (!data) return notFound();

  const coreDomain = data.coreDomain?.trim() || "core.voxd.ai";
  const coreBaseUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : `https://${coreDomain}`;

  const primaryColour = data.primaryColour || "#6366f1";
  const logoBgColour = data.showLogoOnColour || "#ffffff";
  const orgName = data.organisationName;

  const logoUrl = data.logoFileExtension
    ? `https://s3.${process.env.NEXT_PUBLIC_WASABI_REGION || "eu-west-1"}.wasabisys.com/${process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME || "voxd"}/organisationLogos/${data.organisationId}.${data.logoFileExtension}`
    : null;

  return (
    <DemoWebsite
      orgName={orgName}
      logoUrl={logoUrl}
      logoBgColour={logoBgColour}
      primaryColour={primaryColour}
    >
      <ChatEmbed
        agentId={data.prototypingAgentId}
        coreBaseUrl={coreBaseUrl}
        primaryColour={primaryColour}
        sessionData={{ quoteId: data.quoteId }}
        brandAsOrganisationId={data.organisationId}
      />
    </DemoWebsite>
  );
}
